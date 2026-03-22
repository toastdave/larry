# Implementation Roadmap

## Phase 1 - Foundation

- Finalize repository conventions, environments, local containers, and CI entrypoints.
- Establish Drizzle schema ownership, seed data, and workspace task runners.
- Ship the public shell, auth flows, and starter account and chat routes.

## Phase 2 - Conversations And Persistence

- Implement conversation creation, message persistence, and saved history surfaces.
- Add the initial streaming chat endpoint and loading, success, and error states.
- Add mobile-friendly composer and transcript layouts.

## Phase 3 - Live Search And Citations

- Launch provider adapters for web search and structured sports data.
- Add query persistence, result ranking, and citation rendering.
- Add routing rules for when live search is mandatory before answering.

## Phase 4 - Persona And Billing

- Launch team preferences, persona controls, and opinion-versus-facts prompting.
- Add usage ledgers, plan enforcement, and Polar checkout foundations.
- Add upgrade messaging and limit states in chat.

## Phase 5 - Operations And Growth

- Add provider event tracing, operational runbooks, and reliability dashboards.
- Add recap, sharing, and referral surfaces.
- Evaluate sponsorship placements that do not degrade the primary chat loop.

## Cross-cutting launch checklist

- Every core route works on mobile and desktop.
- Core actions have empty, loading, success, and error states.
- Auth, AI, search, sports-data, and billing secrets are separated by environment.
- Retrieval and answer failures are traceable from UI to provider metadata.
- Pricing and sponsorship surfaces are disclosed clearly before launch.
