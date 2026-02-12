export const ALLOWED_ARCHETYPES = ["mentor", "rebel", "sage", "explorer"];
export const ALLOWED_DRAMA = ["low", "medium", "high"];

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateGenerateRequest(payload) {
  const errors = [];

  if (!isPlainObject(payload)) {
    return {
      ok: false,
      errors: [{ field: "body", message: "Request body must be a JSON object." }],
    };
  }

  const allowedKeys = new Set(["archetype", "drama", "emojiLevel", "prompt"]);
  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      errors.push({ field: key, message: "Unknown field is not allowed." });
    }
  }

  if (!ALLOWED_ARCHETYPES.includes(payload.archetype)) {
    errors.push({
      field: "archetype",
      message: `Must be one of: ${ALLOWED_ARCHETYPES.join(", ")}.`,
    });
  }

  if (!ALLOWED_DRAMA.includes(payload.drama)) {
    errors.push({ field: "drama", message: `Must be one of: ${ALLOWED_DRAMA.join(", ")}.` });
  }

  if (!Number.isInteger(payload.emojiLevel) || payload.emojiLevel < 0 || payload.emojiLevel > 5) {
    errors.push({ field: "emojiLevel", message: "Must be an integer between 0 and 5." });
  }

  if (typeof payload.prompt !== "string" || payload.prompt.trim().length === 0) {
    errors.push({ field: "prompt", message: "Must be a non-empty string." });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    value: {
      archetype: payload.archetype,
      drama: payload.drama,
      emojiLevel: payload.emojiLevel,
      prompt: payload.prompt.trim(),
    },
  };
}
