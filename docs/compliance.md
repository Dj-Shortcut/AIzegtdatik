# Compliance-sectie (huidige runtime-implementatie)

Dit document beschrijft wat de app **nu daadwerkelijk doet** in runtime.

## 1) Dataverwerking & bewaartermijnen

### Verwerkte data in runtime
- **Input naar `/api/generate` / `/api/genSentence`**: `archetype`, `drama`, `emojiLevel`, `prompt`.
- **Tijdelijke verwerking**: payload wordt alleen in-memory gebruikt voor validatie + LLM-aanroep.
- **Rate limiting sleutel**: `remoteAddress` (IP-adres van de HTTP-verbinding), in-memory bijgehouden per proces.
- **Safety-events in logs**: alleen technische metadata (`type`, `route`, `requestId`, `outcome`, `reason`, `llmAttempts`, `ipFamily`, `timestamp`).
- **Niet gelogd**: geen ruwe quiz-antwoorden, geen `prompt`-tekst, geen gegenereerde AI-tekst in safety-logs.

### Bewaartermijnen (huidige gedrag)
- **Applicatie-state** (rate limiter): vluchtig/in-memory, verdwijnt bij procesrestart.
- **Backend bewaart geen database-records** voor quiz-uitkomsten of gebruikersprofielen.
- **Logs** volgen platform/host-configuratie (niet door applicatiecode afgedwongen in deze repo).

## 2) Content safety-flow voor AI-output

1. **Inputvalidatie**
   - Strikte schema-validatie op toegestane velden + waarden.
2. **LLM generatie**
   - Server roept provider aan met retry/timeout.
3. **Server-side outputfilter (na generatie)**
   - Bij match met geblokkeerde policy-patronen wordt output vervangen door een veilige canned zin.
   - Lege output wordt ook vervangen door dezelfde veilige canned zin.
4. **Minimale technische logging**
   - Alleen safety-event metadata; geen ruwe user-content.
5. **Fail-safe fallback**
   - Als LLM-aanroep faalt: deterministische fallbackzin op basis van archetype/drama.

## 3) Misbruikpreventie (huidige implementatie)

- **Rate limit per IP-adres** op API-endpointniveau.
- **Server-side enforcement** met 429 + `retry-after` header.
- Geen aparte sessie/device fingerprinting in huidige code.

## 4) User transparency in UI

In het zichtbare result/share-gedeelte staat expliciet:

- “We slaan niets op. Alles is tijdelijk.”
- “Voor fun — geen psychologisch profiel/diagnose.”

## 5) Review-checklist (huidige status)

- [x] Data minimization op API-payload en safety-logs.
- [x] Safety controls: validatie + outputfilter + fallback.
- [x] Abuse prevention: server-side rate limiting.
- [x] User transparency: duidelijke microcopy op result/share-oppervlak.
- [ ] Expliciete log-retentie in code/config van dit project (nu afhankelijk van hostomgeving).
- [ ] Persistente audit-opslag buiten runtime memory.
