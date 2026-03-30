# Larry

Larry is an AI sports chat app with the mouth of a barstool diehard and the receipts to back it up.

## Requirements

- `mise`
- `Docker` with `docker compose`
- `Tailscale` for mandatory local tailnet access

## Getting started

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Update `.env` for your machine:

```dotenv
BETTER_AUTH_URL=https://<device>.<tailnet>.ts.net:1501
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:1501,https://<device>.<tailnet>.ts.net:1501
AI_PROVIDER_TARGET=local
```

3. Install the toolchain and dependencies:

```bash
mise install
mise run install
```

4. Choose a development workflow:

- `mise run dev` for the web app on your host machine with Docker-managed support services
- `mise run dev:docker` for the entire stack in Docker with hot reload

For real AI responses in local development, run Ollama on your machine and pull the default model:

```bash
ollama pull llama3.1:8b
```

## Local development

Run the supporting services in Docker and the web app on your host machine.

Start:

```bash
mise run docker:up
mise run db:push
mise run seed
mise run dev
```

App URLs:

- Web app: `http://localhost:1501`
- Mailpit: `http://localhost:1504`
- Postgres: `postgresql://postgres:postgres@localhost:1502/larry`

Stop supporting services:

```bash
mise run docker:down
```

Reset local infrastructure data:

```bash
docker compose down -v
```

The app supports hot reload in this mode. Leave the Docker services running while you edit files locally.

## Full Docker development

Run the entire app stack inside Docker with hot reload.

Start:

```bash
mise run dev:docker
```

This task runs detached. Follow the app logs with:

```bash
docker compose logs -f web
```

In another shell, initialize the database if needed:

```bash
mise run db:push
mise run seed
```

Open:

- Web app: `http://localhost:1501`
- Mailpit: `http://localhost:1504`
- Postgres: `postgresql://postgres:postgres@localhost:1502/larry`

Stop:

```bash
mise run docker:down
```

Reset all Docker data:

```bash
docker compose down -v
```

The stack is safe to leave running during development. Code changes are picked up by the containerized Vite dev server.

For full Docker development, the app container reaches Ollama on your host through `host.docker.internal`.

## Tailscale access

Expose the web app to your tailnet after either local or full Docker development is running.

Local development in this repo assumes the tailnet URL is available for auth callbacks and cross-device testing.

This repo uses the same port locally and over Tailscale so multiple projects can share one tailnet node without colliding on `443`.

Start Tailscale Serve:

```bash
mise run tailscale:up
```

Check status:

```bash
mise run tailscale:status
```

Stop serving over Tailscale:

```bash
mise run tailscale:down
```

Open the app from another device on your tailnet:

```text
https://<device>.<tailnet>.ts.net:1501
```

Use the full `https://` URL. This setup serves HTTPS on port `1501`; `http://` requests to the tailnet hostname will fail.

## Auth setup

- Email/password auth uses `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `BETTER_AUTH_TRUSTED_ORIGINS`.
- GitHub OAuth callback: `http://localhost:1501/api/auth/callback/github`
- Google OAuth callback: `http://localhost:1501/api/auth/callback/google`
- For tailnet access, use the same callback paths on `https://<device>.<tailnet>.ts.net:1501`

## AI setup

- Local development defaults to Ollama with `AI_PROVIDER_TARGET=local` and `AI_OLLAMA_BASE_URL`.
- Hosted environments should switch to `AI_PROVIDER_TARGET=hosted` and provide `AI_GATEWAY_API_KEY` so Larry can route to Gemini through the Vercel AI SDK.
- Default local model: `llama3.1:8b`
- Default hosted model: `google/gemini-2.5-flash`

## Live data setup

- Narrative search defaults to Tavily through `SEARCH_PROVIDER=tavily`.
- Structured scores and standings default to ESPN's public endpoints through `SPORTS_DATA_PROVIDER=espn`.
- If Tavily is not configured, Larry can still use the structured ESPN feed for supported score and standings questions, but broader news context will be missing.

## Billing setup

- `POLAR_ACCESS_TOKEN` is used for Polar API access.
- `POLAR_WEBHOOK_SECRET` validates webhook deliveries.
- `POLAR_SERVER` should stay on `sandbox` until subscription checkout and entitlement sync are verified end-to-end.

## Billing environments

- Local app development: use seeded plans and usage fixtures to exercise upgrade prompts, limits, and entitlement states.
- Polar sandbox: use `https://sandbox.polar.sh/start` for fake-money checkout and `https://sandbox-api.polar.sh` for API calls.
- Production Polar: enable only after sandbox checkout, webhook replay handling, and plan-sync behavior are verified.

Sandbox notes:

- Polar sandbox is a separate environment, not a production test-mode toggle.
- Sandbox uses separate accounts, organizations, and tokens.
- Stripe test cards work in Polar sandbox, for example `4242 4242 4242 4242` with a future expiry and any CVC.

## Common commands

```bash
mise run check
mise run lint
mise run test
mise run build
mise run db:generate
mise run db:migrate
mise run db:studio
```
