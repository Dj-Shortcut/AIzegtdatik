const questions = [
  {
    text: "Hoe reageer je op chaos in de groepschat?",
    options: [
      { label: "Ik kalmeer iedereen", archetype: "mentor", drama: "low", emoji: 1 },
      { label: "Ik gooi olie op het vuur", archetype: "rebel", drama: "high", emoji: 3 },
      { label: "Ik analyseer eerst", archetype: "sage", drama: "low", emoji: 0 },
    ],
  },
  {
    text: "Jouw favoriete vibe?",
    options: [
      { label: "Rust & focus", archetype: "sage", drama: "low", emoji: 1 },
      { label: "Actie & avontuur", archetype: "explorer", drama: "medium", emoji: 2 },
      { label: "Motiveren", archetype: "mentor", drama: "medium", emoji: 2 },
    ],
  },
  {
    text: "Bij kritiek doe jij…",
    options: [
      { label: "Reflecteren", archetype: "sage", drama: "low", emoji: 0 },
      { label: "Terugvuren met humor", archetype: "rebel", drama: "high", emoji: 3 },
      { label: "Omzetten in groei", archetype: "mentor", drama: "medium", emoji: 1 },
    ],
  },
  {
    text: "Je weekendplan:",
    options: [
      { label: "Nieuwe plek ontdekken", archetype: "explorer", drama: "medium", emoji: 2 },
      { label: "Vrienden coachen", archetype: "mentor", drama: "low", emoji: 1 },
      { label: "Diepe rabbit hole induiken", archetype: "sage", drama: "medium", emoji: 0 },
    ],
  },
  {
    text: "Meest gebruikte emoji-stijl:",
    options: [
      { label: "Bijna nooit", archetype: "sage", drama: "low", emoji: 0 },
      { label: "Soms subtiel", archetype: "mentor", drama: "medium", emoji: 2 },
      { label: "Overal 😂🔥", archetype: "rebel", drama: "high", emoji: 5 },
    ],
  },
];

const dramaWeight = { low: 1, medium: 2, high: 3 };
const quizForm = document.getElementById("quizForm");
const submitBtn = document.getElementById("submitBtn");
const resultSection = document.getElementById("result");
const archetypeText = document.getElementById("archetypeText");
const sentenceText = document.getElementById("sentenceText");
const statusEl = document.getElementById("status");
const shareBtn = document.getElementById("shareBtn");
const copyBtn = document.getElementById("copyBtn");
const canvas = document.getElementById("badgeCanvas");

let latestShareText = "";

function initFbInstant() {
  if (!window.FBInstant) return;
  window.FBInstant.initializeAsync().then(() => {
    window.FBInstant.startGameAsync();
  }).catch(() => {
    statusEl.textContent = "FBInstant init mislukt, lokale modus actief.";
  });
}

function renderQuiz() {
  questions.forEach((q, idx) => {
    const fieldset = document.createElement("fieldset");
    fieldset.className = "question";

    const legend = document.createElement("legend");
    legend.textContent = `${idx + 1}. ${q.text}`;
    fieldset.appendChild(legend);

    const options = document.createElement("div");
    options.className = "options";

    q.options.forEach((opt, i) => {
      const id = `q${idx}-${i}`;
      const label = document.createElement("label");
      label.innerHTML = `<input type="radio" name="q${idx}" id="${id}" value="${i}" ${i === 0 ? "checked" : ""}/> ${opt.label}`;
      options.appendChild(label);
    });

    fieldset.appendChild(options);
    quizForm.appendChild(fieldset);
  });
}

function calculateProfile() {
  const scores = { mentor: 0, rebel: 0, sage: 0, explorer: 0 };
  let dramaTotal = 0;
  let emojiTotal = 0;

  questions.forEach((q, idx) => {
    const checked = document.querySelector(`input[name=\"q${idx}\"]:checked`);
    const choice = q.options[Number(checked.value)];
    scores[choice.archetype] += 1;
    dramaTotal += dramaWeight[choice.drama];
    emojiTotal += choice.emoji;
  });

  const archetype = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const dramaAvg = dramaTotal / questions.length;
  const drama = dramaAvg < 1.8 ? "low" : dramaAvg < 2.4 ? "medium" : "high";
  const emojiLevel = Math.min(5, Math.round(emojiTotal / questions.length));
  const engagementScore = Math.round((emojiLevel + dramaAvg) * 20);

  return { archetype, drama, emojiLevel, engagementScore };
}

function drawBadge({ archetype, drama, sentence, engagementScore }) {
  const palette = {
    mentor: "#1d4ed8",
    rebel: "#b91c1c",
    sage: "#065f46",
    explorer: "#7c3aed",
  };

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = palette[archetype] ?? "#1f2937";
  ctx.fillRect(0, 0, 1080, 1080);

  ctx.fillStyle = "white";
  ctx.font = "bold 80px Inter, Arial";
  ctx.fillText("AI zegt dat ik…", 80, 140);

  ctx.font = "bold 92px Inter, Arial";
  ctx.fillText(archetype.toUpperCase(), 80, 300);

  ctx.font = "48px Inter, Arial";
  ctx.fillText(`Drama: ${drama.toUpperCase()}`, 80, 400);
  ctx.fillText(`Engagement: ${engagementScore}`, 80, 470);

  ctx.font = "42px Inter, Arial";
  wrapText(ctx, sentence, 80, 620, 900, 58);
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, currentY);
}

async function generateSentence(profile) {
  const response = await fetch("/api/genSentence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      archetype: profile.archetype,
      drama: profile.drama,
      emojiLevel: profile.emojiLevel,
      prompt: "Max 25 woorden, speels en niet kwetsend.",
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload?.error?.message || "Kon AI-zin niet genereren.");
  }

  return payload.data.text;
}

submitBtn.addEventListener("click", async () => {
  statusEl.textContent = "Resultaat wordt berekend…";
  const profile = calculateProfile();

  try {
    const sentence = await generateSentence(profile);
    resultSection.classList.remove("hidden");
    archetypeText.textContent = `Archetype: ${profile.archetype} • Drama: ${profile.drama}`;
    sentenceText.textContent = sentence;
    latestShareText = `AI zegt dat ik ${profile.archetype} ben (${profile.drama}). ${sentence}`;
    drawBadge({ ...profile, sentence });
    statusEl.textContent = "Klaar om te delen.";
  } catch (error) {
    statusEl.textContent = `Fout: ${error.message}`;
  }
});

copyBtn.addEventListener("click", async () => {
  if (!latestShareText) return;
  await navigator.clipboard.writeText(latestShareText);
  statusEl.textContent = "Statustekst gekopieerd.";
});

shareBtn.addEventListener("click", async () => {
  if (!latestShareText) return;
  if (!window.FBInstant) {
    statusEl.textContent = "FBInstant niet beschikbaar (lokale test). Gebruik kopieerknop.";
    return;
  }

  const image = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
  try {
    await window.FBInstant.shareAsync({
      intent: "SHARE",
      image,
      text: latestShareText,
      data: { source: "ai-zegt-dat-ik" },
    });
    statusEl.textContent = "Succesvol gedeeld.";
  } catch {
    statusEl.textContent = "Delen afgebroken of mislukt.";
  }
});

renderQuiz();
initFbInstant();
