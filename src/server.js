import http from "node:http";
import { validateGenerateRequest } from "./schema.js";
import { createRateLimiter } from "./rateLimit.js";
import { callLlmWithRetry } from "./llmClient.js";
import { getDeterministicFallback } from "./fallbacks.js";

function sendJson(res, statusCode, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    ...extraHeaders,
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};

  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw Object.assign(new Error("Invalid JSON body."), { code: "BAD_JSON" });
  }
}

export function createServer({ llmClient = callLlmWithRetry, rateLimit = {} } = {}) {
  const checkRateLimit = createRateLimiter(rateLimit);

  return http.createServer(async (req, res) => {
    if (req.method !== "POST" || req.url !== "/api/generate") {
      return sendJson(res, 404, {
        ok: false,
        error: {
          code: "NOT_FOUND",
          message: "Route not found.",
          state: "error",
          retryable: false,
        },
      });
    }

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
  });
}
