# AI zegt dat ik… — Instant Game MVP

MVP voor een Facebook Instant Game met:

- 5-vragen quiz (A/B/C keuzes)
- Archetype + drama + engagement score
- AI-zin via backend endpoint
- Sharebare badge (canvas) en tekst
- Integratie met `FBInstant.shareAsync`

## Starten

```bash
npm start
```

Open daarna `http://localhost:3000`.

## Testen

```bash
npm test
```

## Belangrijke bestanden

- `public/index.html` — game UI
- `public/app.js` — quiz engine + badge + share flow
- `src/server.js` — API + static hosting
- `fbapp-config.json` — Instant Games configuratie
- `docs/compliance.md` — trust/safety/compliance
- `SHARE_CHAIN_SPEC.md` — end-to-end share pipeline
- `QA_MATRIX_RELEASE.md` — release gates M1-M5
