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
BETTER_AUTH_URL=https://<device>.<tailnet>.ts.net:7422
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:7422,https://<device>.<tailnet>.ts.net:7422
```

3. Install the toolchain and dependencies:

```bash
mise install
mise run install
```

4. Choose a development workflow:

- `mise run dev` for the web app on your host machine with Docker-managed support services
- `mise run dev:docker` for the entire stack in Docker with hot reload

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

- Web app: `http://localhost:7422`
- Mailpit: `http://localhost:8025`
- Postgres: `postgresql://postgres:postgres@localhost:5432/larry`

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

- Web app: `http://localhost:7422`
- Mailpit: `http://localhost:8025`
- Postgres: `postgresql://postgres:postgres@localhost:5432/larry`

Stop:

```bash
mise run docker:down
```

Reset all Docker data:

```bash
docker compose down -v
```

The stack is safe to leave running during development. Code changes are picked up by the containerized Vite dev server.

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
https://<device>.<tailnet>.ts.net:7422
```

Use the full `https://` URL. This setup serves HTTPS on port `7422`; `http://` requests to the tailnet hostname will fail.

## Auth setup

- Email/password auth uses `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and `BETTER_AUTH_TRUSTED_ORIGINS`.
- GitHub OAuth callback: `http://localhost:7422/api/auth/callback/github`
- Google OAuth callback: `http://localhost:7422/api/auth/callback/google`
- For tailnet access, use the same callback paths on `https://<device>.<tailnet>.ts.net:7422`

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
