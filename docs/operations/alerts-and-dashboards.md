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

## Suggested thresholds

- AI failures above 10 percent for 10 minutes
- Search zero-result rate above 40 percent for live prompts over 10 minutes
- Billing webhook failures above 3 consecutive deliveries
- Entitlement sync delay above 5 minutes after successful checkout return

## Review cadence

- Daily during active product iteration
- Before shipping pricing, provider, or persona changes
- Immediately after any provider outage or billing incident
