import test from "node:test";
import assert from "node:assert/strict";
import { callLlmWithRetry } from "../src/llmClient.js";

test("retries on timeout and eventually succeeds", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls < 3) {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }
    return {
      ok: true,
      async json() {
        return { text: "generated" };
      },
    };
  };

  const result = await callLlmWithRetry(
    { archetype: "mentor", drama: "low", emojiLevel: 1, prompt: "x" },
    { apiUrl: "http://llm.test", fetchImpl, maxRetries: 2, baseDelayMs: 1 }
  );

  assert.equal(result.text, "generated");
  assert.equal(result.attempts, 3);
});

test("throws non-retryable config error", async () => {
  await assert.rejects(
    callLlmWithRetry(
      { archetype: "mentor", drama: "low", emojiLevel: 1, prompt: "x" },
      { apiUrl: "", fetchImpl: async () => ({ ok: true, json: async () => ({ text: "x" }) }) }
    ),
    (err) => err.code === "LLM_CONFIG_ERROR"
  );
});
