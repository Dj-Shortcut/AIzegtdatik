import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

async function requestJson(server, payload, path = "/api/generate") {
  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });

  return {
    status: response.status,
    body: await response.json(),
    headers: response.headers,
  };
}

test("validates schema strictly", async () => {
  const server = createServer({ llmClient: async () => ({ text: "ok", attempts: 1 }) });
  await new Promise((resolve) => server.listen(0, resolve));

  const res = await requestJson(server, {
    archetype: "wizard",
    drama: "mid",
    emojiLevel: 8,
    prompt: "",
    unknown: true,
  });

  assert.equal(res.status, 422);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
  assert.ok(res.body.error.details.length >= 4);

  server.close();
});

test("uses deterministic fallback when llm fails", async () => {
  const server = createServer({
    llmClient: async () => {
      throw Object.assign(new Error("timeout"), { code: "LLM_TIMEOUT", retryable: true });
    },
  });
  await new Promise((resolve) => server.listen(0, resolve));

  const res = await requestJson(server, {
    archetype: "mentor",
    drama: "high",
    emojiLevel: 2,
    prompt: "help",
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.meta.fallbackUsed, true);
  assert.equal(res.body.data.meta.source, "fallback");
  assert.equal(res.body.data.text, "Adem in, herpak je richting, en zet vandaag één moedige stap vooruit.");

  server.close();
});

test("rate limits on endpoint level", async () => {
  const server = createServer({
    llmClient: async () => ({ text: "ok", attempts: 1 }),
    rateLimit: { maxRequests: 1, windowMs: 60_000 },
  });
  await new Promise((resolve) => server.listen(0, resolve));

  const payload = { archetype: "sage", drama: "low", emojiLevel: 1, prompt: "x" };
  const first = await requestJson(server, payload);
  const second = await requestJson(server, payload);

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.equal(second.body.error.code, "RATE_LIMITED");

  server.close();
});

test("enforces /api/genSentence schema and returns { line }", async () => {
  const server = createServer({
    llmClient: async () => ({ text: "hello\nthere\nfriend with extra words over the max limit yes absolutely", attempts: 1 }),
  });
  await new Promise((resolve) => server.listen(0, resolve));

  const res = await requestJson(server, {
    archetype: "sage",
    dramaScore: 42,
    engagementScore: 77,
    emojiLevel: 1,
  }, "/api/genSentence");

  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(res.body), ["line"]);
  assert.equal(res.body.line.includes("\n"), false);
  assert.ok(res.body.line.split(/\s+/).length <= 25);

  const bad = await requestJson(server, { archetype: "sage" }, "/api/genSentence");
  assert.equal(bad.status, 400);
  assert.deepEqual(Object.keys(bad.body), ["line"]);

  server.close();
});

test("applies per-IP rate limiter to /api/genSentence", async () => {
  const server = createServer({
    llmClient: async () => ({ text: "ok", attempts: 1 }),
    rateLimit: { maxRequests: 1, windowMs: 60_000 },
  });
  await new Promise((resolve) => server.listen(0, resolve));

  const payload = { archetype: "mentor", dramaScore: 30, engagementScore: 50, emojiLevel: 2 };
  const first = await requestJson(server, payload, "/api/genSentence");
  const second = await requestJson(server, payload, "/api/genSentence");

  assert.equal(first.status, 200);
  assert.equal(second.status, 429);
  assert.deepEqual(Object.keys(second.body), ["line"]);

  server.close();
});

test("serves front-end index page", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/`, { method: "GET" });
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /AI zegt dat ik/);

  server.close();
});

test("returns 404 structured error for unknown route", async () => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, resolve));

  const port = server.address().port;
  const response = await fetch(`http://127.0.0.1:${port}/api/unknown`, { method: "POST" });
  const body = await response.json();

  assert.equal(response.status, 404);
  assert.equal(body.error.code, "NOT_FOUND");

  server.close();
});
