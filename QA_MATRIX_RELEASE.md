# QA Matrix — Release Gates (M1–M5)

Gebruik dit document als harde go/no-go gate voor iedere releasecandidate.

## Gate regels

- Een milestone is alleen **PASS** als **alle checks** in die milestone op PASS staan.
- Een milestone is **FAIL** zodra één check FAIL is.
- **M5 kan alleen PASS zijn als M1–M4 PASS zijn.**

## Snapshot status

| Milestone | Gate focus | Huidige status |
|---|---|---|
| M1 | Load-time checks | ☐ PASS ☑ FAIL |
| M2 | Gameplay determinisme checks | ☐ PASS ☑ FAIL |
| M3 | AI safety/output checks | ☐ PASS ☑ FAIL |
| M4 | Share pipeline checks | ☐ PASS ☑ FAIL |
| M5 | API health + release readiness | ☐ PASS ☑ FAIL |

---

## M1 — Load-time checks

| Check | Pass-criterium | FAIL wanneer |
|---|---|---|
| SDK init | `FBInstant.initializeAsync()` en `startGameAsync()` slagen in Instant Games container | Eén van beide promise-calls reject of timeout |
| Console health | 0 console errors tijdens cold start + eerste interactie | Minstens 1 console error tijdens flow |
| Cold start budget | P95 load/cold-start binnen teamtarget (bijv. <= 3s op referentiedevice) | P95 boven target of geen meetrapport |

**Artifacts vereist:** init-log export, console capture, performance rapport met build-id.

**Milestone verdict M1:** ☐ PASS ☐ FAIL

---

## M2 — Gameplay determinisme checks

| Check | Pass-criterium | FAIL wanneer |
|---|---|---|
| Scoreberekening deterministic | Identieke input geeft 100% identieke output over afgesproken runs (bijv. N=100) | Minstens één run met afwijkende output |
| Testset coverage | Vaste versioned testcase set met happy path + edge cases aanwezig | Testset ontbreekt of niet versioned |
| Random/time isolation | Geen on-gefixeerde random/time dependency in tests | Random/time beïnvloedt resultaat |

**Artifacts vereist:** testrun output, testcase overzicht, CI run-link.

**Milestone verdict M2:** ☐ PASS ☐ FAIL

---

## M3 — AI safety/output checks

| Check | Pass-criterium | FAIL wanneer |
|---|---|---|
| Woordlimiet | 100% outputs in validatieset <= 25 woorden | Eén of meer outputs > 25 woorden |
| Toonregels | 100% outputs voldoen aan afgesproken toon/rubric | Eén of meer outputs buiten rubric |
| Safety policy | 0 policy violations in safety-evaluatie | Minstens 1 policy violation |

**Artifacts vereist:** validatieset, output checker report, safety report, prompt/model versie.

**Milestone verdict M3:** ☐ PASS ☐ FAIL

---

## M4 — Share pipeline checks

| Check | Pass-criterium | FAIL wanneer |
|---|---|---|
| Payload validatie | Share payload voldoet 100% aan schema (intent/image/text/data) | Schemafout, ontbrekend required field, of type mismatch |
| Share flow runtime | `FBInstant.shareAsync` opent en retourneert succesvol in testflow | reject/cancel zonder correcte handling of crash |
| Device + orientation matrix | Verplichte devices (minimaal 1 iOS, 1 Android) + portrait/landscape testcases geslaagd | Eén verplicht device/oriëntatie profiel faalt |

**Artifacts vereist:** schema logs, device-matrix, reproduceerbare stappen/screencast.

**Milestone verdict M4:** ☐ PASS ☐ FAIL

---

## M5 — API health + release readiness

| Check | Pass-criterium | FAIL wanneer |
|---|---|---|
| API health | `/api/genSentence` geeft stabiel success-response volgens contract (`ok: true`, `data.text`) onder normale load | Contractbreuk, verhoogde 5xx, of instabiele latency |
| Release artifact integrity | `npm run build:release` levert valide zip met alleen vereiste upload assets | Build faalt of artifact bevat ontbrekende/extra kritieke files |
| Go-live readiness | Pre-submit checklist + regressies + rollback dry-run compleet en ondertekend | Onvolledige checklist of rollback niet getest |

**Artifacts vereist:** API monitor snapshot, build logs, artifact checksum, checklist-export, rollback dry-run bewijs.

**Milestone verdict M5:** ☐ PASS ☐ FAIL

---

## Eindbesluit (Go/No-Go)

- [ ] M1 PASS
- [ ] M2 PASS
- [ ] M3 PASS
- [ ] M4 PASS
- [ ] M5 PASS
- [ ] Open risico’s expliciet geaccepteerd
- [ ] Release owner akkoord

**Final verdict:** ☐ GO ☐ NO-GO  
**Release owner:** ____________________  
**Datum/tijd:** ____________________
