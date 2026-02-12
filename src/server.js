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

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { code: "BAD_JSON" });
  }
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

  return http.createServer(async (req, res) => {
    if (req.method === "GET" && ["/", "/app.js", "/styles.css", "/fbapp-config.json"].includes(req.url)) {
      return serveStatic(req, res);
    }

    if (req.method === "GET" && req.url === "/health") {
      return sendJson(res, 200, { ok: true });
    }

    if (req.method === "POST" && ["/api/generate", "/api/genSentence"].includes(req.url)) {
      return generate(req, res);
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
