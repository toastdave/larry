# Implementation Roadmap

## Phase 1 - Foundation

- Finalize repository conventions, environments, local containers, and CI entrypoints.
- Establish Drizzle schema ownership, seed data, and workspace task runners.
- Lock the Vercel AI SDK as the inference layer and wire environment-based provider config for Ollama locally and Gemini in hosted environments.
- Ship the public shell, auth flows, and starter account and chat routes.

Status: functionally complete for local, Docker, and tailnet development.

## Phase 2 - Conversations And Persistence

- Implement conversation creation, message persistence, and saved history surfaces.
- Add the initial Vercel AI SDK streaming chat endpoint and loading, success, and error states.
- Add mobile-friendly composer and transcript layouts.

Status: complete for the first production-style pass.

## Phase 3 - Live Search And Citations

- Launch provider adapters for web search and structured sports data.
- Add query persistence, result ranking, and citation rendering.
- Add routing rules for when live search is mandatory before answering.

Status: functionally complete for the MVP, with ranked retrieval, structured odds/injuries coverage, line-movement metadata, and inline numbered citation references now live in chat.

- Completed: Tavily web search adapter, ESPN structured scoreboard/standings adapter, ESPN structured injuries adapter, ESPN core odds adapter, persisted search traces, stronger result ranking, inline numbered citation references in the transcript, Vega stale-board guardrails for odds-oriented prompts, deeper Scout-specific structured-result ranking, and provider retrieval plus line-movement metadata for odds snapshots
- Remaining: richer provider-native board-update timestamps if the provider exposes them reliably

## Phase 4 - Multi-Persona Product Layer

- Launch conversation-level persona selection for Larry, Scout, and Vega.
- Add a persona resolver and prompt composition flow that can swap voice, answer style, and retrieval emphasis without branching the whole app.
- Add team preferences, rivalry context, and opinion-versus-facts prompting across all personas.
- Define persona-aware starter prompts, chat labels, and saved-history cues.
- Add trust and safety guidance for odds-aware answers before Vega is fully exposed.

Status: partially started.

- Completed: base Larry persona prompt, seeded persona profile, billing schema, seeded plans, usage-ledger writes for search/inference, runtime persona selection, conversation persona persistence, persona-aware chat UX, account-driven favorite/rival team context in the live prompt path, stronger Vega betting-adjacent guardrails, shared abuse-edge prompt guidance, persona eval cases for regression coverage, product-level safe-response handling for abusive and reckless prompts, and automated eval execution in the test suite
- Remaining: any extra UI affordances beyond the in-thread guardrail reply

Status note: chat history search, persona filtering, and cleaner auto-title refinement are now live for the conversation UX.

## Phase 5 - Billing, Packaging, And Growth

- Add usage ledgers, plan enforcement, and Polar checkout foundations.
- Validate subscription checkout and entitlement sync in Polar sandbox before enabling live billing.
- Add upgrade messaging and limit states in chat.
- Decide whether Scout and Vega are package-level differentiators after product validation.
- Add provider event tracing, operational runbooks, and reliability dashboards.
- Harden provider switching, tracing, and incident handling for Ollama in local development and Gemini in hosted environments.
- Add recap, sharing, and referral surfaces.
- Evaluate sponsorship placements that do not degrade the primary chat loop.

Status: partially started with seeded-plan usage summaries, upgrade messaging, Polar sandbox checkout routes, and entitlement sync now visible in account and chat.

- Completed: seeded plans, entitlement primitives, usage-ledger writes, account-level billing summary, chat/account upgrade messaging, Polar sandbox checkout routes, and webhook/return-based entitlement sync
- Remaining: hard plan enforcement and product packaging decisions for premium personas

## Cross-cutting launch checklist

- Every core route works on mobile and desktop.
- Core actions have empty, loading, success, and error states.
- Auth, AI, search, sports-data, and billing secrets are separated by environment.
- Billing environments are explicit: local app development, Polar sandbox, then live production.
- AI inference runs through the Vercel AI SDK, with Ollama as the default local provider and Gemini as the hosted provider path.
- Retrieval and answer failures are traceable from UI to provider metadata.
- Pricing and sponsorship surfaces are disclosed clearly before launch.
