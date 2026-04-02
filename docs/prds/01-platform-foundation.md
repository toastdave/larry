# Platform Foundation

## Goal

Create the technical and product foundation for a fast-moving SvelteKit monolith that can support AI chat, live search, usage tracking, billing, and future sponsorship surfaces without forcing an early service split.

## MVP scope

- Monorepo structure with `apps/web`, `packages/db`, `packages/ai`, and `packages/search`
- Bun-native SSR output, local Docker services, detached full-stack Docker dev, Tailscale Serve access, and mise task runners
- Environment handling, database schema ownership, local seeding, and remote-preview runbooks
- Vercel AI SDK as the shared inference layer, with Ollama for local development and Google Gemini for hosted environments
- Shared design tokens, landing page, auth routes, and starter chat shell

## Current status

- Completed: workspace scaffold, Bun workspaces, Docker and Compose workflows, Tailscale Serve tasks, root tooling, and repo agent guidance
- Completed: environment-driven AI provider routing, with Ollama locally and Gemini as the hosted path through the AI SDK
- Completed: seeded plans, seeded default persona profile, and database ownership through `packages/db`
- Completed: GitHub Actions now runs lint, typecheck, and test validation on pushes and pull requests
- Remaining: production-grade deployment runbooks beyond local and tailnet workflows

## Requirements

- Local, full Docker, and tailnet preview setups work from a fresh clone with documented commands.
- Core environments exist for local, preview, and production.
- AI provider selection is environment-driven so local builds use Ollama and hosted builds can route to Gemini without app-level rewrites.
- Database changes are versioned and repeatable.
- The app shell is opinionated enough to guide future chat and account work.

## Task breakdown

- Lock workspace conventions, scripts, and package versions.
- Set up Biome, strict TypeScript checks, and baseline tests.
- Containerize Postgres, mail testing, and SSR app runtime.
- Add reset instructions, detached Docker workflows, and Tailscale Serve tasks.
- Add environment variables for auth, billing, AI routing, and search providers.
- Define the Vercel AI SDK integration boundary and provider configuration for Ollama locally and Gemini in preview and production.
- Build the initial SvelteKit shell with public, auth, chat, and account routes.
- Seed baseline plans and a default Larry persona profile.

## Acceptance criteria

- A new developer can start the app locally in under 15 minutes.
- The app builds with Bun SSR output.
- Local development can point chat inference at Ollama, while hosted environments can switch to Gemini through configuration.
- Schema, seeds, local services, and tailnet preview run without manual patching.

## Non-goals

- Production infra provisioning
- Dedicated worker autoscaling on day one
