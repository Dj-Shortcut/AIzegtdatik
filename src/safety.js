const CANNED_SAFE_LINE = "Je vibe is uniek—houd het luchtig, deel met een knipoog en maak er iets leuks van.";

const BLOCKED_PATTERNS = [
  /\b(haat|hate|racis(?:me|t)|nazi|genocide)\b/i,
  /\b(kill|moord|vermoord(?:en)?|shoot|schiet|steken)\b/i,
  /\b(zelfmoord|suicide|self-harm|snij jezelf)\b/i,
  /\b(seks met minderjarige|child\s*sex|verkracht|rape)\b/i,
  /\b(doxx|adres van|telefoonnummer van|ssn|creditcard)\b/i,
  /\b(bom maken|explosief maken|hack\s+dit|phishing)\b/i,
];

export function applySafetyFilter(text) {
  const normalized = String(text ?? "").trim();

  if (!normalized) {
    return {
      text: CANNED_SAFE_LINE,
      replaced: true,
      reason: "EMPTY_OUTPUT",
    };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(normalized)) {
      return {
        text: CANNED_SAFE_LINE,
        replaced: true,
        reason: "POLICY_BLOCKED_PATTERN",
      };
    }
  }

  return {
    text: normalized,
    replaced: false,
    reason: null,
  };
}

export function logSafetyEvent(event) {
  const safeEvent = {
    type: event.type,
    route: event.route,
    requestId: event.requestId,
    outcome: event.outcome,
    reason: event.reason ?? null,
    llmAttempts: typeof event.llmAttempts === "number" ? event.llmAttempts : null,
    ipFamily: event.ipFamily ?? "unknown",
    timestamp: new Date().toISOString(),
  };

  console.info("[safety]", JSON.stringify(safeEvent));
}

export { CANNED_SAFE_LINE };
