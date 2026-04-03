# Alerts And Dashboards

## Core dashboard slices

- AI route health: responses by `routeMode`, `providerName`, error count, and fallback count from `provider_event`
- Search health: query count, zero-result rate, provider failures, and warning count from `search_query` plus `provider_event`
- Billing health: checkout success rate, webhook success rate, entitlement sync lag, and billing mismatch count from `billing_event`
- Product pressure: monthly message-limit hits and live-lookup-limit hits from billing-related `provider_event` rows

## First alerts to wire

- Hosted AI failure spike for the last 10 minutes
- Local Ollama fallback spike during development or preview smoke testing
- Search zero-result rate jumps sharply for one provider or league
- Polar webhook failures or no billing events arriving for an expected checkout window
- Sudden spike in hard plan-enforcement blocks after a pricing or plan change

## Wired now

- `bun run ops:alerts` evaluates threshold health against `provider_event`, `search_query`, and `search_result`
- `bun run ops:alerts:docker` runs the same check inside the Compose web container for the current Docker and Tailscale workflow
- Optional delivery hook: set `OPS_ALERT_WEBHOOK_URL` so the script posts a JSON alert payload when thresholds trip
- The same command can move to a Railway cron or scheduled job later without changing the app code

## Threshold environment variables

- `OPS_ALERT_WINDOW_MINUTES` - rolling lookback window, defaults to `10`
- `OPS_MIN_SAMPLE_SIZE` - minimum event volume before rate-based alerts fire, defaults to `5`
- `OPS_AI_FAILURE_RATE_THRESHOLD` - hosted AI failure-rate trigger, defaults to `0.1`
- `OPS_SEARCH_ZERO_RATE_THRESHOLD` - live-search zero-result trigger, defaults to `0.4`
- `OPS_BILLING_FAILURE_THRESHOLD` - billing failure-count trigger, defaults to `3`
- `OPS_PLAN_BLOCK_THRESHOLD` - hard plan-enforcement spike trigger, defaults to `10`

## Suggested thresholds

- AI failures above 10 percent for 10 minutes
- Search zero-result rate above 40 percent for live prompts over 10 minutes
- Billing webhook failures above 3 consecutive deliveries
- Entitlement sync delay above 5 minutes after successful checkout return

## Review cadence

- Daily during active product iteration
- Before shipping pricing, provider, or persona changes
- Immediately after any provider outage or billing incident
