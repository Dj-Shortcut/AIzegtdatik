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

## Release artifact bouwen (Meta upload)

1. Installeer dependencies:

```bash
npm install
```

2. Valideer Meta Instant Games config (`fbapp-config.json`) op verplichte velden die deze repo gebruikt:

```bash
npm run validate:fbapp-config
```

Gevalideerde verplichte velden:
- `instant_games.platform_version`
- `instant_games.navigation_menu_version`
- `instant_games.orientation`
- `instant_games.match_player_config.minimum_size`
- `instant_games.match_player_config.maximum_size`

3. Maak uploadbaar release artifact:

```bash
npm run build:release
```

Deze command doet:
- assembleert alleen benodigde assets (`public/index.html`, geminificeerde `public/app.js`, geminificeerde `public/styles.css`, `fbapp-config.json`)
- maakt zip voor Meta upload
- output: `dist/release/instant-game-upload.zip`

## Exacte publish-flow naar Meta Instant Games dashboard

1. Open de app in Meta for Developers.
2. Ga naar **Instant Games** > **Web Hosting** (of equivalent release/upload sectie).
3. Kies **Upload Version** en upload `dist/release/instant-game-upload.zip`.
4. Wacht tot validatie/build afrondt.
5. Run smoke test in sandbox/tester mode:
   - game start zonder init errors
   - quiz submit werkt
   - share-flow opent en keert succesvol terug
6. Promote build naar release channel (staging/production volgens jouw app-flow).

## Troubleshooting (init/share failures)

### `FBInstant.initializeAsync` of `startGameAsync` faalt
- Controleer dat je de game start binnen Instant Games container (niet alleen localhost browser).
- Controleer browser console op ontbrekende SDK-context.
- Controleer dat de geüploade zip `fbapp-config.json` bevat met geldige `instant_games` velden.
- Als lokale fallback actief is: UI blijft bruikbaar, maar echte share werkt alleen in FBInstant context.

### `FBInstant.shareAsync` faalt of wordt afgebroken
- Bevestig dat share image gegenereerd wordt (`canvas.toDataURL("image/png")`).
- Controleer payload grootte/format en probeer opnieuw in een schone sessie.
- Controleer dat `latestShareText` niet leeg is (quiz eerst afronden).
- Behandel user-cancel als niet-blokkerende uitkomst; toon duidelijke statusmelding in UI.

### API/init lijkt gezond maar share-resultaat inconsistent
- Controleer netwerkcalls naar `/api/genSentence` op status `ok: true`.
- Controleer rate limits en fallback-responses in backend logs.
- Draai regressiechecks uit `QA_MATRIX_RELEASE.md` voor M1/M4/M5 voordat je opnieuw uploadt.

## Belangrijke bestanden

- `public/index.html` — game UI
- `public/app.js` — quiz engine + badge + share flow
- `src/server.js` — API + static hosting
- `fbapp-config.json` — Instant Games configuratie
- `docs/compliance.md` — trust/safety/compliance
- `SHARE_CHAIN_SPEC.md` — end-to-end share pipeline
- `QA_MATRIX_RELEASE.md` — release gates M1-M5
