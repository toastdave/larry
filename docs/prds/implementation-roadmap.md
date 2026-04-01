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

Status: in progress.

- Completed: Tavily web search adapter, ESPN structured scoreboard/standings adapter, persisted search traces, and citation pills in chat
- Remaining: injuries and odds coverage, better result ranking, inline numbered citations in the generated answer text, and stronger freshness handling for odds-aware answers

## Phase 4 - Multi-Persona Product Layer

- Launch conversation-level persona selection for Larry, Scout, and Vega.
- Add a persona resolver and prompt composition flow that can swap voice, answer style, and retrieval emphasis without branching the whole app.
- Add team preferences, rivalry context, and opinion-versus-facts prompting across all personas.
- Define persona-aware starter prompts, chat labels, and saved-history cues.
- Add trust and safety guidance for odds-aware answers before Vega is fully exposed.

Status: partially started.

- Completed: base Larry persona prompt, seeded persona profile, billing schema, seeded plans, usage-ledger writes for search/inference, runtime persona selection, conversation persona persistence, and persona-aware chat UX
- Remaining: live preference controls, rivalry hooks, and stronger betting-adjacent guardrails

## Phase 5 - Billing, Packaging, And Growth

- Add usage ledgers, plan enforcement, and Polar checkout foundations.
- Validate subscription checkout and entitlement sync in Polar sandbox before enabling live billing.
- Add upgrade messaging and limit states in chat.
- Decide whether Scout and Vega are package-level differentiators after product validation.
- Add provider event tracing, operational runbooks, and reliability dashboards.
- Harden provider switching, tracing, and incident handling for Ollama in local development and Gemini in hosted environments.
- Add recap, sharing, and referral surfaces.
- Evaluate sponsorship placements that do not degrade the primary chat loop.

Status: not started beyond foundational event logging and billing primitives.

## Cross-cutting launch checklist

- Every core route works on mobile and desktop.
- Core actions have empty, loading, success, and error states.
- Auth, AI, search, sports-data, and billing secrets are separated by environment.
- Billing environments are explicit: local app development, Polar sandbox, then live production.
- AI inference runs through the Vercel AI SDK, with Ollama as the default local provider and Gemini as the hosted provider path.
- Retrieval and answer failures are traceable from UI to provider metadata.
- Pricing and sponsorship surfaces are disclosed clearly before launch.
