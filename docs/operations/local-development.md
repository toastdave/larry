# Local Development Runbook

## Start the stack

1. Copy `.env.example` to `.env` and make sure `DATABASE_URL` points at `localhost:1502` for host development.
2. Start support services with `mise run docker:up`.
3. Push schema changes and seed the database with `mise run db:push` and `mise run seed`.
4. Start the app with `mise run dev`.

## Quick health checks

- Web app: `http://localhost:1501`
- Mailpit UI: `http://localhost:1504`
- Postgres: `postgresql://postgres:postgres@localhost:1502/larry`
- Tailnet status: `mise run tailscale:status`

## Common failures

### App boots but auth or DB actions fail

- Confirm `DATABASE_URL` uses port `1502` for host development.
- Run `docker compose ps` and confirm `postgres` is healthy.
- Re-run `mise run db:push` and `mise run seed` after schema changes.

### App loads but AI replies stall

- Check that Ollama is running locally and the configured model is pulled.
- Confirm `AI_PROVIDER_TARGET=local` for local development.
- If running full Docker development, verify the web container can still reach `host.docker.internal`.

### OAuth callbacks fail

- Confirm `BETTER_AUTH_URL` and `BETTER_AUTH_TRUSTED_ORIGINS` match the current localhost or tailnet URL.
- Re-check provider callback URLs in GitHub and Google.

### Need a clean reset

1. Stop services with `mise run docker:down`.
2. Remove local container data with `docker compose down -v`.
3. Recreate the stack and reseed.

## When to escalate

- Local startup consistently fails after a clean reset.
- The same flow works locally but fails in hosted preview.
- Billing webhooks or auth callbacks appear healthy locally but data never lands in Postgres.
