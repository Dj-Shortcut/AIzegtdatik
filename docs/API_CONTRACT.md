# API Contract — AI zegt dat ik

## Endpoint
`POST /api/genSentence`

Alias ondersteund: `POST /api/generate`.

## Request schema
```json
{
  "archetype": "mentor|rebel|sage|explorer",
  "drama": "low|medium|high",
  "emojiLevel": 0,
  "prompt": "Max 25 woorden, speels en niet kwetsend."
}
```

## Success response
```json
{
  "ok": true,
  "data": {
    "text": "Korte AI-zin",
    "meta": {
      "source": "llm|fallback",
      "fallbackUsed": false
    }
  }
}
```

## Error response
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request body does not match schema.",
    "state": "error|retry",
    "retryable": false
  }
}
```

## Constraints
- Max 25 woorden in output (via prompt/rubric afdwingen).
- Geen kwetsende of haatdragende inhoud.
- Timeouts + retries in LLM-client; fallback-zinnen bij storingen.
