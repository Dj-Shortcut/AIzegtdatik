# STATUS

## What works

### Browser local dev mode (without `window.FBInstant`)
- Quiz renders and computes profile from 5 questions in the browser.
- `POST /api/genSentence` is called and returns a sentence when backend is running.
- `Kopieer` flow works as fallback sharing path when Instant Games SDK is absent.
- Starting the app locally serves the site on `http://localhost:3000`.

### FB Instant Games sandbox mode
- App includes FB Instant bootstrap (`initializeAsync` + `startGameAsync`) and only executes it when `window.FBInstant` exists.
- Share flow calls `FBInstant.shareAsync(...)` with image + text payload once a result is generated.

## What fails

### Blocker 1: clean CI install command fails
- **symptom:** `npm ci` exits with `EUSAGE` and refuses to install.
- **trigger path (UI action or endpoint call):** Local/CI setup step: run `npm ci` in repository root.
- **expected vs actual:**
  - Expected: deterministic clean install succeeds.
  - Actual: command fails because no `package-lock.json`/`npm-shrinkwrap.json` is present.
- **severity:** **release-blocking** (standard CI pipelines that require `npm ci` cannot proceed).

### Blocker 2: sharing unavailable in plain browser local dev
- **symptom:** Clicking `Delen via FB Instant` shows `FBInstant niet beschikbaar (lokale test). Gebruik kopieerknop.`
- **trigger path (UI action or endpoint call):** UI action: complete quiz result, then click **Delen via FB Instant** in a regular browser runtime.
- **expected vs actual:**
  - Expected: native Instant Games share sheet opens.
  - Actual: no native share sheet, only local fallback status message.
- **severity:** **non-blocking** (expected outside FB Instant runtime; copy fallback remains available).

### Environment-dependent note for FB Instant Games sandbox
- In sandbox mode, share behavior depends on FB Instant platform state (session, permissions, sandbox tooling). If share is cancelled or platform rejects the request, UI currently collapses both cases into `Delen afgebroken of mislukt.`
- This is **non-blocking** for local development but should be monitored during sandbox QA to distinguish user-cancel vs platform failure.

## Repro steps

### 1) `npm ci`
```bash
npm ci
```
**Expected outcome:** clean dependency install succeeds and exits `0`.

**Actual outcome (current repo):** fails with `npm ERR! code EUSAGE` because lockfile is missing.

### 2) `npm test`
```bash
npm test
```
**Expected outcome:** Node test runner executes suite and all tests pass.

**Actual outcome (current repo):** passes (`8/8` tests green, exit `0`).

### 3) `npm start`
```bash
npm start
```
**Expected outcome:** backend starts, logs `Backend listening on :3000`, and app is reachable at `http://localhost:3000`.

**Actual outcome (current repo):** server starts and responds on `http://localhost:3000`.
