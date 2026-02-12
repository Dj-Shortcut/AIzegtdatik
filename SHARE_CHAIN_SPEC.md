# Volledige share-keten specificatie

## 1) Badge rendering-spec

### Canvas en export
- **Doelformaat:** `1080 x 1080 px` (1:1, social feed vriendelijk).
- **Kleurprofiel:** sRGB.
- **Outputformaat (primair):** PNG (verliesvrij, consistente tekstweergave).
- **Outputformaat (optioneel):** JPEG `quality 0.9` wanneer SDK of transportgrootte limieten oplegt.
- **Maximale payload-richtlijn:** streef naar `< 2.5 MB` per image voor snelle upload/share.

### Typografie en font-fallback
- **Primaire font-stack:**
  1. `"Inter"`
  2. `"SF Pro Display"`
  3. `"Segoe UI"`
  4. `"Roboto"`
  5. `"Helvetica Neue"`
  6. `Arial`
  7. `sans-serif`
- Gebruik **font preloading** voor het primaire lettertype; render pas na `font-ready` event of timeout van 800 ms.
- Bij timeout: render direct met fallback om UX-blokkade te voorkomen.

### Safe text bounds (tekstveilig gebied)
- **Outer margin:** 80 px aan alle zijden.
- **Inner safe box:** `x=80, y=80, width=920, height=920`.
- **Titel-zone:** bovenste 35% van safe box.
- **Body-zone:** midden 45% van safe box.
- **Footer/meta-zone:** onderste 20% van safe box.
- Geen tekst buiten safe box; alle tekstblokken met clipping + ellipsis.

### Tekst-layout regels
- **Titel:** max 2 regels, font-size 64→42 px (auto-shrink), line-height 1.1.
- **Subtitel/body:** max 4 regels, font-size 40→28 px (auto-shrink), line-height 1.25.
- **Footer/tag:** max 1 regel, font-size 28 px, line-height 1.2.
- Minimaal contrast **WCAG AA** benadering (ratio >= 4.5:1 voor body-tekst).

---

## 2) Aanlevering image-data aan share-flow

Gebruik een **adapter-strategie** omdat SDK’s verschillen in input-eisen.

### Datamodel
```ts
type ShareImagePayload = {
  kind: 'base64' | 'file-uri' | 'remote-url';
  mimeType: 'image/png' | 'image/jpeg';
  data: string; // base64 string, file path, of https url
  width: 1080;
  height: 1080;
  sizeBytes?: number;
};
```

### Beslisboom per platform/SDK
1. **SDK ondersteunt binary/base64 direct**
   - Lever `kind='base64'` met data-uri of raw base64 conform SDK-contract.
2. **SDK vereist lokaal bestandspad**
   - Schrijf image naar tijdelijke cache (`file-uri`) en deel via OS share sheet.
3. **SDK vereist publiek bereikbare URL**
   - Upload tijdelijk asset naar media endpoint/CDN, lever `remote-url`.
   - TTL standaard: 24 uur (of korter, privacy-first).

### Validatie vóór share
- Mime type whitelist (`png`, `jpeg`).
- Dimensie-check exact 1080x1080.
- Size-check tegen SDK limiet (configurabel).
- Hash (SHA-256) voor idempotentie/debug.

### Aanbevolen fallback-volgorde
`base64 -> file-uri -> remote-url -> text-only`

---

## 3) Tekst-template met lengte- en taalgrenzen

### Template-structuur
- **Kop:** korte claim/resultaat.
- **Body:** context + CTA.
- **Hashtags/slot:** compact en optioneel.

**Voorbeeldtemplate (NL):**
```txt
🏅 {badgeTitle}
Ik heb {milestone} bereikt via {productName}.
Doe mee: {ctaUrl}
{hashtags}
```

### Lengtelimieten
- **Hard cap totaal:** 280 tekens (platform-neutraal veilig).
- **Soft cap totaal:** 220 tekens (betere leesbaarheid).
- **badgeTitle:** max 40 tekens.
- **milestone:** max 60 tekens.
- **productName:** max 24 tekens.
- **ctaUrl:** max 60 tekens (gebruik korte URL).
- **hashtags:** max 40 tekens.

### Taalgrenzen en lokalisatie
- Ondersteunde talen minimaal: `nl`, `en`.
- Gebruik per taal aparte templatebestanden (geen runtime string-concatenatie verspreid in UI).
- Bij ontbrekende locale: fallback naar `en`.
- Emoji optioneel per locale-config (sommige zakelijke kanalen wensen geen emoji).

### Sanitization
- Verwijder control chars en dubbele whitespace.
- Escape/strip verboden tekens afhankelijk van target-platform.
- Knip op woordgrenzen bij truncatie (`…`).

---

## 4) UX-flow met states

State-machine (deterministisch):

1. **generate**
   - Trigger: user tikt “Genereer badge”.
   - Acties: render image + compose text.
   - UI: loading indicator + disable share-knop.
2. **preview**
   - Voorwaarde: image of text gereed.
   - UI: badge preview, tekstpreview, “Wijzig tekst”, “Delen”.
3. **share**
   - Acties: open native share-sheet / SDK-share-call.
   - UI: blocking spinner of non-blocking progress (platformafhankelijk).
4. **success**
   - Trigger: SDK return success/callback.
   - UI: bevestiging + secundaire CTA (“Terug”, “Nogmaals delen”).
5. **failure**
   - Trigger: renderfout, transportfout of user cancel (apart labelen).
   - UI: duidelijke foutmelding + retry + text-only fallback actie.

### Eventcontract (voorbeeld)
- `BADGE_GENERATE_STARTED`
- `BADGE_GENERATE_SUCCEEDED`
- `BADGE_GENERATE_FAILED`
- `SHARE_OPENED`
- `SHARE_SUCCEEDED`
- `SHARE_FAILED`
- `SHARE_CANCELLED`
- `SHARE_TEXT_ONLY_FALLBACK_USED`

### Metrics
- Render time p50/p95.
- Share success ratio.
- Fallback ratio (image→text).
- Cancel ratio.

---

## 5) Fallback zonder image (text-only)

### Triggercondities
Activeer text-only fallback als één van onderstaande optreedt:
- Badge rendering mislukt.
- Image validatie faalt (afmeting/format/size).
- SDK accepteert image payload niet.
- Upload naar remote asset endpoint faalt of timeout.

### Gedrag
- Behoud dezelfde teksttemplate.
- Toon preview zonder image met label: “Afbeelding niet beschikbaar, je deelt alleen tekst”.
- Share-knop blijft primair beschikbaar (geen dead-end).

### UX-copy (NL)
- **Titel:** “Delen zonder afbeelding”
- **Body:** “Het genereren van de badge is niet gelukt. Je kunt nu wel je resultaat als tekst delen.”
- **Acties:** “Deel tekst”, “Opnieuw proberen”

### Robuustheidsregels
- Maximaal 1 automatische retry voor badge-generatie.
- Daarna expliciet user choice tonen (retry of text-only).
- Log foutcode + fase (`generate`, `transport`, `sdk`) voor troubleshooting.

---

## Implementatie-notes (kort)
- Houd rendering, payload-adapter en UI-state-machine als afzonderlijke modules.
- Vermijd SDK-specifieke logica in UI-componenten; gebruik een `ShareGateway` interface.
- Schrijf contracttests voor adapterbeslisboom en state-machine transities.
