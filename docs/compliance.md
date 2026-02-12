# Compliance-sectie (Facebook Instant Games)

Deze sectie is bedoeld als korte, praktische checklist voor de implementatie en review-submissie.

## 1) Dataverwerking & bewaartermijnen

### Verwerkte data
- **Game-uitkomstdata**: score en archetype-classificatie.
- **Sessiemetadata**: technische IDs voor session/speler (voor anti-misbruik en stabiliteit).
- **Geen PII**: geen naam, e-mail, telefoonnummer, adres of andere direct herleidbare persoonsgegevens.

### Bewaartermijnen
- **Ruwe sessiedata (score/archetype + session-id)**: maximaal **30 dagen**.
- **Geaggregeerde statistieken (niet herleidbaar)**: maximaal **12 maanden** voor productanalyse.
- **Logs voor security/abuse-detectie**: maximaal **90 dagen**.
- **Delen/social payloads**: alleen tijdelijk in verwerking; geen langdurige opslag buiten platformvereisten.

## 2) Content safety-flow voor AI-output

1. **Inputvalidatie**
   - Whitelist van toegestane inputvelden.
   - Lengte- en karakterlimieten.
   - Blokkeren van duidelijke prompt-injection patronen en ongewenste tokens.

2. **Prompt-guardrails**
   - Systeemprompt met expliciete policy: geen haat, geweldsverheerlijking, seksuele/illegale instructies, doxxing of misleiding.
   - Context beperken tot game-uitkomst (score/archetype), zonder persoonsdata.

3. **Output-filtering**
   - Moderatie-check op modeloutput vóór tonen/delen.
   - Fallback-antwoord bij policy-violatie (neutraal, veilig, niet-triggertaal).
   - Event logging van geblokkeerde outputs voor monitoring en tuning.

## 3) Misbruikpreventie

- **Rate limits per speler-id** (bijv. N requests per minuut).
- **Rate limits per session-id/device fingerprint** om spam-sessies te beperken.
- **Burst + rolling window** (korte piek + langere periode).
- **Backoff/temporary block** bij herhaalde overschrijding.
- **Server-side enforcement** (niet alleen client-side).

## 4) User copy in de UI vóór delen

Toon vóór delen expliciet welke data wordt gepost, bijvoorbeeld:

> “Je staat op het punt dit te delen: **je score**, **je archetype-label**, en een **korte AI-gegenereerde beschrijving**. Er worden **geen persoonlijke gegevens** (zoals e-mail of telefoonnummer) meegestuurd.”

Aanvullend:
- Geef een **preview** van de exacte share-tekst.
- Bied een **annuleerknop** en optioneel “pas tekst aan” (indien productbeleid dit toelaat).

## 5) Mapping naar Facebook Instant Games review-checkpoints

Gebruik onderstaande afvinklijst bij submissie:

- [ ] **Data minimization**: alleen score/archetype + technische sessiegegevens; geen PII.
- [ ] **Retention policy**: bewaartermijnen expliciet en geïmplementeerd.
- [ ] **User transparency**: duidelijke pre-share copy met exacte payload.
- [ ] **Safety controls**: inputvalidatie, prompt-guardrails en outputfilter actief.
- [ ] **Abuse prevention**: rate limits per speler en per sessie/device.
- [ ] **Policy alignment**: gedeelde content is niet misleidend, schadelijk of policy-schendend.
- [ ] **Auditability**: relevante moderatie-/abuse-events gelogd voor review en incidentrespons.

> Tip voor submitter: neem per checkpoint een korte verwijzing op naar codebestand/config of screenshot, zodat de reviewer snel kan verifiëren.
