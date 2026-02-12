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

test("supports /api/genSentence alias", async () => {
  const server = createServer({ llmClient: async () => ({ text: "ok", attempts: 1 }) });
  await new Promise((resolve) => server.listen(0, resolve));

  const res = await requestJson(
    server,
    { archetype: "sage", drama: "low", emojiLevel: 1, prompt: "x" },
    "/api/genSentence"
  );

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.data.text, "ok");

  server.close();
});

test("replaces unsafe llm output with canned safe line", async () => {
  const server = createServer({
    llmClient: async () => ({ text: "Je moet iemand vermoorden vandaag.", attempts: 1 }),
  });
  await new Promise((resolve) => server.listen(0, resolve));

  const res = await requestJson(server, {
    archetype: "rebel",
    drama: "high",
    emojiLevel: 3,
    prompt: "x",
  });

  assert.equal(res.status, 200);
  assert.equal(res.body.data.meta.source, "llm");
  assert.equal(res.body.data.meta.safetyFiltered, true);
  assert.equal(
    res.body.data.text,
    "Je vibe is uniek—houd het luchtig, deel met een knipoog en maak er iets leuks van."
  );

  server.close();
});

test("logs safety events without raw quiz content", async () => {
  const logs = [];
  const originalInfo = console.info;
  console.info = (...args) => logs.push(args.join(" "));

  const server = createServer({
    llmClient: async () => ({ text: "deel dit telefoonnummer van Jan", attempts: 2 }),
  });
  await new Promise((resolve) => server.listen(0, resolve));

  try {
    await requestJson(server, {
      archetype: "mentor",
      drama: "low",
      emojiLevel: 1,
      prompt: "mijn echte quiz data",
    });
  } finally {
    console.info = originalInfo;
    server.close();
  }

  assert.equal(logs.length, 1);
  const entry = logs[0];
  assert.match(entry, /\[safety\]/);
  assert.match(entry, /"type":"generation_filter"/);
  assert.doesNotMatch(entry, /mijn echte quiz data/i);
  assert.doesNotMatch(entry, /telefoonnummer/i);
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
