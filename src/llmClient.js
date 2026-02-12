function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildPrompt(payload) {
  return [
    `Archetype: ${payload.archetype}`,
    `Drama: ${payload.drama}`,
    `Emoji level: ${payload.emojiLevel}`,
    `User prompt: ${payload.prompt}`,
  ].join("\n");
}

export async function callLlmWithRetry(payload, options = {}) {
  const {
    fetchImpl = fetch,
    apiUrl = process.env.LLM_API_URL,
    apiKey = process.env.LLM_API_KEY,
    timeoutMs = 3_000,
    maxRetries = 2,
    baseDelayMs = 250,
  } = options;

  if (!apiUrl) {
    throw Object.assign(new Error("LLM API URL is not configured."), {
      code: "LLM_CONFIG_ERROR",
      retryable: false,
    });
  }

  let attempt = 0;
  let lastError;

  while (attempt <= maxRetries) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(apiUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ prompt: buildPrompt(payload) }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const retryable = response.status >= 500 || response.status === 429;
        throw Object.assign(new Error(`LLM provider responded with HTTP ${response.status}.`), {
          code: "LLM_HTTP_ERROR",
          statusCode: response.status,
          retryable,
        });
      }

      const data = await response.json();
      if (typeof data.text !== "string" || data.text.trim().length === 0) {
        throw Object.assign(new Error("LLM provider returned invalid payload."), {
          code: "LLM_INVALID_RESPONSE",
          retryable: false,
        });
      }

      return { text: data.text.trim(), attempts: attempt + 1 };
    } catch (error) {
      clearTimeout(timeoutId);
      const isAbort = error?.name === "AbortError";
      const retryable = isAbort || error?.retryable === true;
      const normalizedError = Object.assign(new Error(error.message), {
        code: isAbort ? "LLM_TIMEOUT" : error.code ?? "LLM_ERROR",
        retryable,
      });

      lastError = normalizedError;
      if (!retryable || attempt === maxRetries) {
        break;
      }

      const backoffMs = baseDelayMs * (attempt + 1);
      await delay(backoffMs);
    }

    attempt += 1;
  }

  throw lastError;
}
