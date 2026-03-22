# Larry

Larry is an AI sports chat app with the mouth of a barstool diehard and the receipts to back it up.

## Locked stack

- `SvelteKit` + `Svelte 5`
- `Tailwind CSS v4`
- `Drizzle ORM`
- `Postgres`
- `Better Auth`
- `AI SDK` + `Vercel AI Gateway`
- `Bun workspaces`
- `Biome`
- `Docker Compose`
- `mise`

## Workspace layout

- `apps/web` - landing page, auth, chat shell, and account surfaces
- `packages/db` - Drizzle schema, migrations, and seeds
- `packages/ai` - sports-fan persona and orchestration helpers
- `packages/search` - live search and citation normalization contracts
- `docs/prds` - product and implementation planning docs
- `docker/web` - container image for dev and production SSR

## Product stance

- Larry should sound like a loud, opinionated sports fan at a bar.
- Larry should still fetch fresh data for live topics like scores, odds, trades, injuries, standings, and schedules.
- Larry should separate opinions from factual claims and attach citations when using live data.
- Billing is planned as a hybrid model: subscriptions plus usage-based overage or credit packs.
- Ads should stay outside the active chat loop and never influence factual answers.

## Quick start

1. `cp .env.example .env`
2. `mise install`
3. `mise run install`
4. `mise run docker:up`
5. `mise run db:push`
6. `mise run seed`
7. `mise run dev`

To run the app inside Docker instead, use `mise run dev:docker`.

## Auth setup

- Email/password auth uses `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.
- GitHub OAuth callback: `http://localhost:5173/api/auth/callback/github`
- Google OAuth callback: `http://localhost:5173/api/auth/callback/google`

## AI and data setup

- Chat routing is expected to use `AI_GATEWAY_API_KEY`.
- Primary chat model defaults to `openai/gpt-5-mini`.
- Search and sports data are planned behind separate provider keys so Larry can combine narrative context with live structured facts.

## Core commands

- `mise run dev` - run the SvelteKit app locally with Bun
- `mise run lint` - run Biome linting
- `mise run format` - format the repo with Biome
- `mise run check` - run Svelte and TypeScript checks
- `mise run test` - run Bun tests
- `mise run build` - produce the SSR build
- `mise run db:generate` - generate Drizzle migrations
- `mise run db:migrate` - apply migrations
- `mise run db:studio` - open Drizzle Studio

## Notes

- The repo starts as a `SvelteKit` monolith plus focused workspace packages for AI and search.
- The billing schema is in place early so inference cost controls are part of the foundation.
- The ad strategy is documented in `docs/prds/08-growth-and-advertising.md` and intentionally avoids degrading the chat experience.
