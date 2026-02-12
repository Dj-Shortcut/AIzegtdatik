import test from "node:test";
import assert from "node:assert/strict";
import { computeScores, mapArchetype } from "../public/logic.js";

test("computeScores returns exact expected values for a fixed answer set", () => {
  const scores = computeScores({
    intensity: 2,
    conflict: 3,
    overthinking: 1,
    social: 4,
    energy: 2,
    humor: 1,
    emojiPreference: 4,
  });

  assert.deepEqual(scores, {
    dramaScore: 6,
    engagementScore: 7,
    emojiLevel: 4,
  });
});

test("mapArchetype maps fixed score buckets to expected archetypes", () => {
  assert.deepEqual(mapArchetype({ dramaScore: 8, engagementScore: 4, emojiLevel: 2 }), {
    archetype: "ANALYTISCHE_REBEL",
  });

  assert.deepEqual(mapArchetype({ dramaScore: 5, engagementScore: 8, emojiLevel: 4 }), {
    archetype: "VERBINDER",
  });

  assert.deepEqual(mapArchetype({ dramaScore: 2, engagementScore: 9, emojiLevel: 5 }), {
    archetype: "MEME_LORD",
  });
});

test("covers low, medium, and high drama classifications", () => {
  const lowDrama = mapArchetype({ dramaScore: 2, engagementScore: 8, emojiLevel: 5 });
  const mediumDrama = mapArchetype({ dramaScore: 5, engagementScore: 7, emojiLevel: 3 });
  const highDrama = mapArchetype({ dramaScore: 9, engagementScore: 3, emojiLevel: 1 });

  assert.equal(lowDrama.archetype, "MEME_LORD");
  assert.equal(mediumDrama.archetype, "VERBINDER");
  assert.equal(highDrama.archetype, "ANALYTISCHE_REBEL");
});
