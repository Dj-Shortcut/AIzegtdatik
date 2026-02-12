# QA-matrix per milestone (Release Owner)

Gebruik dit document als afvinkbare kwaliteitsgate per milestone.  
**Regel:** een milestone is alleen **PASS** als **alle** criteria binnen die milestone op PASS staan.

## Startstatus (ingevuld op basis van huidige repository-audit)

> Deze eerste invulling is gestart op basis van code + tests in deze repo. Alles zonder bewijs/artifact blijft **open** tot jij de ontbrekende info aanlevert.

| Milestone | Voorlopige status | Waarom nu |
|---|---|---|
| M1 | ☐ PASS ☑ FAIL | Geen SDK-init events/log-export/performance-rapport in deze backend-repo gevonden. |
| M2 | ☐ PASS ☑ FAIL | Validatie- en fallbacktests bestaan, maar geen expliciete scoremodule + 100-run determinisme-rapport. |
| M3 | ☐ PASS ☑ FAIL | Er is fallbackgedrag, maar geen harde output-checker voor ≤25 woorden/toon/safety in testset. |
| M4 | ☐ PASS ☑ FAIL | Request-schema validatie bestaat; device/orientatie matrix ontbreekt. |
| M5 | ☐ PASS ☑ FAIL | Geen complete pre-submit export, regressierapport en rollback dry-run bewijs gevonden. |

### Open vragen voor jou (nodig om verder af te vinken)

- [ ] Kun je de **SDK init logs** en **cold-start performance-rapporten** delen voor M1?
- [ ] Bestaat er buiten deze repo een **scoreberekening-module** + vaste testcase-set voor M2?
- [ ] Heb je een **AI-validatieset** (woordlimiet, toon, safety) voor M3?
- [ ] Kun je de **device/orientatie testmatrix** voor M4 aanleveren?
- [ ] Is er een **rollback runbook** + dry-run output voor M5?

---

## Overzicht

| Milestone | Scope | Status (PASS/FAIL) | Opmerkingen |
|---|---|---|---|
| M1 | SDK init events, no-console-errors, cold-start tijd | ☐ PASS ☐ FAIL | |
| M2 | Deterministische scoreberekening met vaste testcases | ☐ PASS ☐ FAIL | |
| M3 | AI-output constraints (<=25 woorden, toonregels, safe output) | ☐ PASS ☐ FAIL | |
| M4 | Share payload validatie op meerdere devices/orientaties | ☐ PASS ☐ FAIL | |
| M5 | Pre-submit checklist incl. regressies en rollback-plan | ☐ PASS ☐ FAIL | |

---

## M1 — SDK init events, no-console-errors, cold-start tijd

- [ ] **SDK init events aanwezig en compleet**  
  **Pass-criterium (objectief):** vereiste init-events verschijnen exact 1x per cold start in logs/telemetry en bevatten verplichte velden.
- [ ] **Geen console errors tijdens init flow**  
  **Pass-criterium (objectief):** 0 `error`-niveau meldingen in console tijdens volledige init flow op testbuild.
- [ ] **Cold-start tijd binnen target**  
  **Pass-criterium (objectief):** P95 cold-start ≤ afgesproken SLA/target in meetrapport.

**Bewijs/artifacts:**
- [ ] Log-export toegevoegd
- [ ] Performance-rapport toegevoegd
- [ ] Build/version genoteerd

**Milestone verdict M1:** ☐ PASS ☐ FAIL

---

## M2 — Deterministische scoreberekening met vaste testcases

- [x] **Vaste testset aanwezig (input + expected output)**  
  **Pass-criterium (objectief):** testset is versioned en bevat minimaal afgesproken kernscenario’s + edge-cases.
- [ ] **Determinisme over herhaalde runs**  
  **Pass-criterium (objectief):** 100% identieke score-uitkomsten voor gelijke input over N runs (N volgens teamafspraak, bijv. 100).
- [x] **Geen niet-deterministische dependencies actief**  
  **Pass-criterium (objectief):** random/time/externe invloeden zijn gemockt of gefixeerd in testcontext.

**Bewijs/artifacts:**
- [ ] Testrun-rapport met run-aantallen
- [x] Overzicht testcases + expected values
- [ ] CI-link/build-id

**Milestone verdict M2:** ☐ PASS ☐ FAIL

---

## M3 — AI-output constraints (<=25 woorden, toonregels, safe output)

- [ ] **Lengtebeperking afgedwongen**  
  **Pass-criterium (objectief):** 100% van outputs in validatieset bevat ≤25 woorden.
- [ ] **Toonregels nageleefd**  
  **Pass-criterium (objectief):** 100% van outputs voldoet aan gedefinieerde toonregels volgens checker/rubric.
- [ ] **Safe output policies nageleefd**  
  **Pass-criterium (objectief):** 0 policy violations in safety-evaluatie op validatieset.

**Bewijs/artifacts:**
- [ ] Validatieset + resultaten
- [ ] Safety-rapport
- [ ] Prompt/modelversie gedocumenteerd

**Milestone verdict M3:** ☐ PASS ☐ FAIL

---

## M4 — Share payload validatie op meerdere devices/orientaties

- [x] **Payload schema-validatie geslaagd**  
  **Pass-criterium (objectief):** payload valideert 100% tegen afgesproken schema (required fields, types, limits).
- [ ] **Cross-device validatie**  
  **Pass-criterium (objectief):** alle verplichte device-profielen (minimaal iOS + Android referentiemodellen) geslaagd zonder blokkerende defects.
- [ ] **Orientatie-validatie**  
  **Pass-criterium (objectief):** portrait + landscape geven consistente en valide payloads op alle testdevices.

**Bewijs/artifacts:**
- [ ] Device-matrix met resultaten
- [x] Schema-validatielogs
- [ ] Reproduceerbare teststappen

**Milestone verdict M4:** ☐ PASS ☐ FAIL

---

## M5 — Pre-submit checklist incl. regressies en rollback-plan

- [ ] **Pre-submit checklist volledig uitgevoerd**  
  **Pass-criterium (objectief):** alle verplichte checks zijn groen en ondertekend door eigenaar/vervanger.
- [ ] **Regressies gecontroleerd**  
  **Pass-criterium (objectief):** afgesproken regressiesuite 100% uitgevoerd; geen openstaande blocker/high defects.
- [ ] **Rollback-plan gereed en getest**  
  **Pass-criterium (objectief):** rollback-procedure gedocumenteerd, eigenaar toegewezen, en minimaal 1 dry-run succesvol.

**Bewijs/artifacts:**
- [ ] Checklist-export
- [ ] Regressierapport + defectoverzicht
- [ ] Rollback runbook + dry-run bewijs

**Milestone verdict M5:** ☐ PASS ☐ FAIL

---

## Release-go/no-go samenvatting

- [ ] Alle milestones M1 t/m M5 staan op PASS
- [ ] Openstaande risico’s expliciet geaccepteerd
- [ ] Release owner akkoord

**Eindbesluit:** ☐ GO ☐ NO-GO  
**Release owner:** ____________________  
**Datum/tijd:** ____________________
