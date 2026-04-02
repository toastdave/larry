# Provider Outage Runbook

## Scope

Use this runbook when Larry stops returning live sports answers, citations disappear, or model calls fail outright.

## First look

1. Check whether the issue is local only or also present in preview/production.
2. Inspect recent `provider_event` rows for the failing path.
3. Inspect `usage_ledger` and `search_query` rows for the affected conversation or user.

## AI provider failures

### Local Ollama path

- Verify Ollama is running and the configured model still exists.
- Confirm `.env` still points `AI_PROVIDER_TARGET=local` and the Ollama base URL is reachable.
- If the model is missing, pull it again and retry the same prompt.

### Hosted Gemini path

- Confirm `AI_PROVIDER_TARGET=hosted` and `AI_GATEWAY_API_KEY` are present.
- Check recent `provider_event` payloads for route mode, finish reason, and error message.
- If the hosted path is failing broadly, switch incident messaging to recommend retrying later while fallback replies stay available.

## Search provider failures

### Tavily narrative search

- Verify the Tavily key is configured.
- Check `provider_event` rows with `providerKind=search` for provider errors or empty results.
- If Tavily is down, expect broader narrative context to degrade while structured ESPN answers can still work.

### ESPN structured data

- Confirm the issue is not league- or sport-specific.
- Inspect stored `search_result.metadata` for missing odds or injury payloads.
- If ESPN payloads change shape, fall back to safer non-odds answers and document the breakage.

## Customer-facing posture

- Keep live-data claims conservative when freshness is uncertain.
- Let fallback or guardrail replies stand instead of forcing speculative answers.
- If Vega cannot verify odds freshness, preserve the safety reply.

## Recovery checks

- Ask one standard non-live prompt.
- Ask one live score prompt.
- Ask one Vega odds-oriented prompt and verify either fresh odds or the stale-data guardrail.
