# Billing Reconciliation Runbook

## Scope

Use this runbook when a user completes Polar checkout but Larry still shows the wrong entitlement, wrong limit state, or missing upgrade messaging.

## Checkout return issues

1. Confirm the account returned through `/account?checkout=success&checkout_id=...`.
2. Re-run the sync path by refreshing the account page while signed in.
3. Check `billing_event` for `checkout.*` rows and `customer.state_synced` rows.

## Webhook issues

1. Confirm Polar is posting to `/api/billing/polar`.
2. Verify `POLAR_WEBHOOK_SECRET` matches the current sandbox or production environment.
3. Inspect `billing_event` for the webhook `providerEventId` to confirm dedupe and processing state.

## Entitlement mismatch issues

- Inspect the latest `user_entitlement` row for the user.
- Compare `planId`, `status`, `startsAt`, and `endsAt` against Polar customer state.
- Confirm the in-app product IDs map to the correct seeded plan slugs.

## Limit-state issues

- Inspect current-month `usage_ledger` rows for `inference` and `search` entries.
- Remember that live-lookups are enforced per retrieval event, not per individual search result row.
- Revisit the account and chat pages to confirm the updated plan and remaining monthly allowance.

## Recovery paths

- Re-run checkout sync for the signed-in user.
- Replay the missing Polar webhook if the provider supports it.
- If the subscription was cancelled externally, confirm the entitlement is moved back to the correct in-app state.
