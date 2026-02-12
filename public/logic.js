export const ARCHETYPE_TABLE = {
  ANALYTISCHE_REBEL: {
    id: "ANALYTISCHE_REBEL",
    match: ({ dramaScore, engagementScore, emojiLevel }) =>
      dramaScore >= 7 && engagementScore <= 5 && emojiLevel <= 2,
  },
  VERBINDER: {
    id: "VERBINDER",
    match: ({ dramaScore, engagementScore, emojiLevel }) =>
      dramaScore >= 4 && dramaScore <= 6 && engagementScore >= 6 && emojiLevel >= 3 && emojiLevel <= 4,
  },
  MEME_LORD: {
    id: "MEME_LORD",
    match: ({ dramaScore, engagementScore, emojiLevel }) =>
      dramaScore <= 3 && engagementScore >= 7 && emojiLevel >= 5,
  },
};

export function computeScores(answers = {}) {
  const dramaScore =
    Number(answers.intensity ?? 0) +
    Number(answers.conflict ?? 0) +
    Number(answers.overthinking ?? 0);

  const engagementScore =
    Number(answers.social ?? 0) +
    Number(answers.energy ?? 0) +
    Number(answers.humor ?? 0);

  const emojiLevel = Math.max(1, Math.min(5, Number(answers.emojiPreference ?? 1)));

  return { dramaScore, engagementScore, emojiLevel };
}

export function mapArchetype(scores) {
  for (const config of Object.values(ARCHETYPE_TABLE)) {
    if (config.match(scores)) {
      return { archetype: config.id };
    }
  }

  if (scores.dramaScore >= 7) {
    return { archetype: "ANALYTISCHE_REBEL" };
  }

  if (scores.engagementScore >= 7) {
    return { archetype: "MEME_LORD" };
  }

  return { archetype: "VERBINDER" };
}
