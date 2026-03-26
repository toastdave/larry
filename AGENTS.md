# AGENTS.md

## Overview
Larry is an AI sports chat app with a loud sports-bar voice, live-data expectations, and citation-backed answers.
Build user-facing product experiences only; do not expose scaffolding, prompt wiring, or implementation details in the UI.
Use `docs/prds` for product requirements and `.agents/` for agent references, workflow notes, and external implementation guidance.

## Stack
- Bun workspaces
- SvelteKit 2 + Svelte 5
- Tailwind CSS v4
- Better Auth
- AI SDK + Vercel AI Gateway
- Drizzle ORM + PostgreSQL
- Docker Compose for local infrastructure and full Docker development
- Tailscale Serve for mandatory local tailnet access
- mise for developer tasks
- Biome for formatting and linting
