# Preview And Production Deployment Runbook

## Scope

This runbook covers the release path after local development is healthy and CI is green.

## Pre-deploy checklist

- `bun run lint`
- `bun run check`
- `bun run test`
- Confirm required secrets exist for auth, AI routing, search, billing, and database access
- Confirm Polar stays in sandbox until checkout and webhook replay behavior are verified end to end

## Preview deployment

1. Merge the branch only after CI passes.
2. Deploy with hosted AI routing enabled through `AI_PROVIDER_TARGET=hosted`.
3. Use preview-safe auth callback URLs and trusted origins.
4. Verify one auth flow, one chat prompt, one live-data answer, and one billing upgrade entry point.

## Production deployment

1. Confirm preview smoke checks passed.
2. Promote the same build or commit that passed preview validation.
3. Switch production billing only after sandbox validation is complete.
4. Verify webhook delivery, entitlement sync, and the current plan snapshot on a production-safe test account.

## Rollback triggers

- Auth callback failures spike after deploy
- Hosted AI failures or fallback rates jump sharply
- Live retrieval stops citing sources for routine prompts
- Billing checkout or webhook sync breaks for new orders

## Rollback steps

1. Revert to the last known healthy release.
2. Re-run the core smoke checks.
3. Review provider, billing, and search events to isolate the failing integration.

## Post-deploy smoke checks

- Landing page renders
- Sign-up and sign-in both work
- Guest mode reaches the chat shell
- Signed-in chat can create a new conversation
- A live sports prompt returns citations or a safe fallback
- Account shows plan, usage, and checkout state without errors
- The `ops:alerts` command is available for manual smoke checks now and can be moved into Railway scheduling later
