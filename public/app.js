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
const BADGE_SIZE = 1080;
const SAFE_MARGIN = 88;

let latestShareText = "";
let latestProfile = null;

copyBtn.textContent = "Copy status text";

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

  canvas.width = BADGE_SIZE;
  canvas.height = BADGE_SIZE;

  const ctx = canvas.getContext("2d");
  const contentWidth = BADGE_SIZE - SAFE_MARGIN * 2;
  const dramaLabel = drama.toUpperCase();
  const shortSentence = sentence.length > 90 ? `${sentence.slice(0, 87).trimEnd()}…` : sentence;

  ctx.fillStyle = palette[archetype] ?? "#1f2937";
  ctx.fillRect(0, 0, BADGE_SIZE, BADGE_SIZE);

  ctx.fillStyle = "rgba(255,255,255,0.14)";
  ctx.fillRect(SAFE_MARGIN - 24, SAFE_MARGIN - 24, contentWidth + 48, BADGE_SIZE - SAFE_MARGIN * 2 + 48);

  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.font = "700 84px Inter, Arial, sans-serif";
  ctx.fillText("AI zegt dat ik…", SAFE_MARGIN, 170);

  ctx.font = "800 132px Inter, Arial, sans-serif";
  wrapText(ctx, archetype.toUpperCase(), SAFE_MARGIN, 325, contentWidth, 136);

  ctx.font = "700 56px Inter, Arial, sans-serif";
  ctx.fillText(`Drama: ${dramaLabel}`, SAFE_MARGIN, 520);
  ctx.fillText(`Engagement: ${engagementScore}/100`, SAFE_MARGIN, 595);

  ctx.font = "500 50px Inter, Arial, sans-serif";
  wrapText(ctx, shortSentence, SAFE_MARGIN, 715, contentWidth, 64);

  ctx.font = "600 40px Inter, Arial, sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.fillText("Maak je eigen badge op aizegtdatik.nl", SAFE_MARGIN, BADGE_SIZE - SAFE_MARGIN - 18);
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

function buildStatusTemplate({ archetype, drama, engagementScore }, sentence) {
  return `AI zegt dat ik ${archetype} ben ✨\nDrama: ${drama.toUpperCase()} | Engagement: ${engagementScore}/100\n${sentence}\nDoe de quiz: aizegtdatik.nl`;
}

function buildSharePayload(base64Image, text) {
  const supportedApis = typeof window.FBInstant?.getSupportedAPIs === "function"
    ? window.FBInstant.getSupportedAPIs()
    : [];
  const payload = {
    image: base64Image,
    data: { source: "ai-zegt-dat-ik" },
  };

  if (supportedApis.includes("shareAsync")) {
    payload.intent = "SHARE";
    payload.text = text;
  }

  return payload;
}

function setSharingState(isSharing) {
  shareBtn.disabled = isSharing;
  shareBtn.textContent = isSharing ? "Bezig met delen…" : "Delen via Instant Games";
}

submitBtn.addEventListener("click", async () => {
  statusEl.textContent = "Resultaat wordt berekend…";
  const profile = calculateProfile();

  try {
    const sentence = await generateSentence(profile);
    latestProfile = profile;
    resultSection.classList.remove("hidden");
    archetypeText.textContent = `Archetype: ${profile.archetype} • Drama: ${profile.drama}`;
    sentenceText.textContent = sentence;
    latestShareText = buildStatusTemplate(profile, sentence);
    drawBadge({ ...profile, sentence });
    statusEl.textContent = "Klaar om te delen.";
  } catch (error) {
    statusEl.textContent = `Fout: ${error.message}`;
  }
});

copyBtn.addEventListener("click", async () => {
  if (!latestShareText) return;
  await navigator.clipboard.writeText(latestShareText);
  statusEl.textContent = "Status gekopieerd. Plak deze in je Facebook-post.";
});

shareBtn.addEventListener("click", async () => {
  if (!latestShareText || !latestProfile) return;
  if (!window.FBInstant) {
    statusEl.textContent = "FBInstant niet beschikbaar. Gebruik 'Copy status text' en deel handmatig op Facebook.";
    return;
  }

  const image = canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
  const payload = buildSharePayload(image, latestShareText);

  setSharingState(true);
  statusEl.textContent = "Deelvenster wordt geopend…";

  try {
    await window.FBInstant.shareAsync(payload);
    statusEl.textContent = "Succesvol gedeeld.";
  } catch {
    statusEl.textContent = "Delen lukte niet. 1) Tik op 'Copy status text'. 2) Open Facebook handmatig. 3) Plaats de tekst + badge-afbeelding.";
  } finally {
    setSharingState(false);
  }
});

renderQuiz();
initFbInstant();
