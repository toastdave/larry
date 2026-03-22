# Platform Foundation

## Goal

Create the technical and product foundation for a fast-moving SvelteKit monolith that can support AI chat, live search, usage tracking, billing, and future sponsorship surfaces without forcing an early service split.

## MVP scope

- Monorepo structure with `apps/web`, `packages/db`, `packages/ai`, and `packages/search`
- Bun-native SSR output, local Docker services, and mise task runners
- Environment handling, database schema ownership, and local seeding
- Shared design tokens, landing page, auth routes, and starter chat shell

## Requirements

- Local setup works from a fresh clone with documented commands.
- Core environments exist for local, preview, and production.
- Database changes are versioned and repeatable.
- The app shell is opinionated enough to guide future chat and account work.

## Task breakdown

- Lock workspace conventions, scripts, and package versions.
- Set up Biome, strict TypeScript checks, and baseline tests.
- Containerize Postgres, mail testing, and SSR app runtime.
- Add environment variables for auth, billing, AI routing, and search providers.
- Build the initial SvelteKit shell with public, auth, chat, and account routes.
- Seed baseline plans and a default Larry persona profile.

## Acceptance criteria

- A new developer can start the app locally in under 15 minutes.
- The app builds with Bun SSR output.
- Schema, seeds, and local services run without manual patching.

## Non-goals

- Production infra provisioning
- Dedicated worker autoscaling on day one
