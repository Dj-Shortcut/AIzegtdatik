import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { validateGenerateRequest } from "./schema.js";
import { createRateLimiter } from "./rateLimit.js";
import { callLlmWithRetry } from "./llmClient.js";
import { getDeterministicFallback } from "./fallbacks.js";

const PUBLIC_DIR = join(process.cwd(), "public");
const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};
const GEN_SENTENCE_MAX_BODY_BYTES = 8 * 1024;
const DRAMA_SCORE_RANGE = { min: 0, max: 100 };
const ENGAGEMENT_SCORE_RANGE = { min: 0, max: 100 };
const DEFAULT_LOCALE = "en-US";

function sendJson(res, statusCode, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  res.end(text);
}

async function serveStatic(req, res) {
  const filePath = req.url === "/" ? "index.html" : req.url.slice(1);
  const normalized = filePath.replace(/\.\./g, "");
  const rootFile = req.url === "/fbapp-config.json";

  const fullPath = rootFile ? join(process.cwd(), "fbapp-config.json") : join(PUBLIC_DIR, normalized);

  try {
    const data = await readFile(fullPath);
    const contentType = MIME_TYPES[extname(fullPath)] ?? "application/octet-stream";
    res.writeHead(200, { "content-type": contentType });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

async function readJsonBody(req, { maxBytes } = {}) {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of req) chunks.push(chunk);
  for (const chunk of chunks) {
    totalBytes += chunk.length;
    if (Number.isInteger(maxBytes) && totalBytes > maxBytes) {
      throw Object.assign(new Error("Request body too large."), { code: "BODY_TOO_LARGE" });
    }
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { code: "BAD_JSON" });
  }
}

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeSingleLine(text) {
  return String(text).replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
}

function bucketDrama(dramaScore) {
  if (dramaScore < 34) return "calm";
  if (dramaScore < 67) return "spicy";
  return "chaotic";
}

function clampToMaxWords(text, maxWords = 25) {
  const words = normalizeSingleLine(text).split(" ").filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return words.slice(0, maxWords).join(" ");
}

function validateGenSentenceBody(payload) {
  const errors = [];
  if (!isPlainObject(payload)) {
    return { ok: false, errors: ["Request body must be a JSON object."] };
  }

  const isNumberInRange = (value, range) =>
    typeof value === "number" && Number.isFinite(value) && value >= range.min && value <= range.max;

  if (typeof payload.archetype !== "string" || payload.archetype.trim().length === 0) {
    errors.push("archetype must be a non-empty string.");
  }

  if (!isNumberInRange(payload.dramaScore, DRAMA_SCORE_RANGE)) {
    errors.push(
      `dramaScore must be a number between ${DRAMA_SCORE_RANGE.min} and ${DRAMA_SCORE_RANGE.max}.`
    );
  }

  if (!isNumberInRange(payload.engagementScore, ENGAGEMENT_SCORE_RANGE)) {
    errors.push(
      `engagementScore must be a number between ${ENGAGEMENT_SCORE_RANGE.min} and ${ENGAGEMENT_SCORE_RANGE.max}.`
    );
  }

  if (!Number.isInteger(payload.emojiLevel) || payload.emojiLevel < 0 || payload.emojiLevel > 5) {
    errors.push("emojiLevel must be an integer between 0 and 5.");
  }

  if (payload.locale !== undefined && typeof payload.locale !== "string") {
    errors.push("locale must be a string when provided.");
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      archetype: payload.archetype.trim(),
      dramaScore: payload.dramaScore,
      engagementScore: payload.engagementScore,
      emojiLevel: payload.emojiLevel,
      locale: payload.locale?.trim() || DEFAULT_LOCALE,
    },
  };
}

function buildGenSentencePrompt(payload) {
  const tone = bucketDrama(payload.dramaScore);
  return [
    "You are writing one short social sentence.",
    "Constraints:",
    "- Return exactly one line.",
    "- Use a playful tone.",
    "- 25 words maximum.",
    "- Non-diagnostic language.",
    "- No harassment or hate.",
    "- Do not claim personal data or private facts.",
    `Tone bucket by dramaScore: ${tone}.`,
    `Locale: ${payload.locale}.`,
    `Archetype: ${payload.archetype}.`,
    `Drama score: ${payload.dramaScore}.`,
    `Engagement score: ${payload.engagementScore}.`,
    `Emoji level: ${payload.emojiLevel}.`,
  ].join("\n");
}

function handleGenSentence({ llmClient, checkRateLimit }) {
  return async (req, res) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
      return sendJson(res, 429, { line: "Rate limit exceeded. Please retry shortly." });
    }

    let body;
    try {
      body = await readJsonBody(req, { maxBytes: GEN_SENTENCE_MAX_BODY_BYTES });
    } catch (error) {
      const statusCode = error.code === "BODY_TOO_LARGE" ? 413 : 400;
      return sendJson(res, statusCode, { line: error.message ?? "Invalid request body." });
    }

    const validation = validateGenSentenceBody(body);
    if (!validation.ok) {
      return sendJson(res, 400, { line: validation.errors.join(" ") });
    }

    const llmPayload = {
      archetype: validation.value.archetype,
      drama: bucketDrama(validation.value.dramaScore),
      emojiLevel: validation.value.emojiLevel,
      prompt: buildGenSentencePrompt(validation.value),
    };

    try {
      const llm = await llmClient(llmPayload);
      const line = clampToMaxWords(llm.text, 25);
      return sendJson(res, 200, { line });
    } catch {
      return sendJson(res, 200, { line: "Big vibe energy only—take a breath, remix your moment, and keep it playful ✨" });
    }
  };
}

function handleGenerate({ llmClient, checkRateLimit }) {
  return async (req, res) => {
    const ip = req.socket.remoteAddress ?? "unknown";
    const limit = checkRateLimit(ip);
    if (!limit.allowed) {
      return sendJson(
        res,
        429,
        {
          ok: false,
          error: {
            code: "RATE_LIMITED",
            message: "Too many requests for this endpoint.",
            state: "retry",
            retryable: true,
            retryAfterMs: Math.max(limit.resetAt - Date.now(), 0),
          },
        },
        { "retry-after": Math.ceil((limit.resetAt - Date.now()) / 1000) }
      );
    }

    let body;
    try {
      body = await readJsonBody(req);
    } catch (error) {
      return sendJson(res, 400, {
        ok: false,
        error: {
          code: error.code,
          message: error.message,
          state: "error",
          retryable: false,
        },
      });
    }

    const validation = validateGenerateRequest(body);
    if (!validation.ok) {
      return sendJson(res, 422, {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request body does not match schema.",
          state: "error",
          retryable: false,
          details: validation.errors,
        },
      });
    }

    try {
      const llm = await llmClient(validation.value);
      return sendJson(res, 200, {
        ok: true,
        data: {
          text: llm.text,
          meta: {
            source: "llm",
            attempts: llm.attempts,
            fallbackUsed: false,
          },
        },
      });
    } catch (error) {
      const fallback = getDeterministicFallback(validation.value.archetype, validation.value.drama);
      return sendJson(res, 200, {
        ok: true,
        data: {
          text: fallback,
          meta: {
            source: "fallback",
            fallbackUsed: true,
            fallbackReason: error.code ?? "LLM_ERROR",
            frontendState: "fallback",
          },
        },
        warnings: [
          {
            code: error.code ?? "LLM_ERROR",
            message: error.message ?? "LLM call failed; deterministic fallback returned.",
            retryable: error.retryable === true,
          },
        ],
      });
    }
  };
}

export function createServer({ llmClient = callLlmWithRetry, rateLimit = {} } = {}) {
  const checkRateLimit = createRateLimiter(rateLimit);
  const generate = handleGenerate({ llmClient, checkRateLimit });
  const genSentence = handleGenSentence({ llmClient, checkRateLimit });

  return http.createServer(async (req, res) => {
    if (req.method === "GET" && ["/", "/app.js", "/styles.css", "/fbapp-config.json"].includes(req.url)) {
      return serveStatic(req, res);
    }

    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && req.url === "/api/generate") {
      return generate(req, res);
    }

    if (req.method === "POST" && req.url === "/api/genSentence") {
      return genSentence(req, res);
    }

    return sendJson(res, 404, {
      ok: false,
      error: {
        code: "NOT_FOUND",
        message: "Route not found.",
        state: "error",
        retryable: false,
      },
    });
  });
}
