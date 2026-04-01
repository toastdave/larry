# Persona And Prompting

## Goal

Turn Larry into a multi-persona sports AI app with distinct voices that feel intentional, useful, and trustworthy without becoming sloppy or unreliable.

## MVP scope

- Default Larry persona profile
- Additional Scout and Vega persona profiles
- Team preference and rivalry context hooks
- Guardrails for separating opinions from factual claims
- Prompt structure that balances tone with tool discipline
- Persona registry or profile system that can evolve without rewriting app code

## Current status

- Completed: the core Larry system prompt lives in `packages/ai` and is used by the AI SDK chat path
- Completed: fallback behavior explicitly avoids inventing live facts when retrieval fails or returns nothing
- Completed: search context can now be injected into the prompt so opinionated replies stay grounded for time-sensitive questions
- Completed: persona profile primitives exist in the data model for future experimentation
- Completed: runtime persona selection now supports Larry, Scout, and Vega at the conversation level
- Completed: users can now save favorite and rival teams, and those preferences feed the live prompt path across personas
- Completed: Vega now gets stricter prompt and fallback guardrails when odds context is stale, missing, or unverified
- Completed: Vega can now lean on structured odds and injury retrieval before talking market context
- Remaining: abuse-edge guidance and deeper persona eval coverage

## Requirements

- The product should support three launch personas: Larry, Scout, and Vega.
- Each persona should feel meaningfully different in tone, answer structure, and retrieval emphasis.
- All personas should clearly separate jokes, speculation, opinion, and sourced factual claims.
- No persona should invent live facts when tools fail.
- Prompting and response shaping should remain portable across the local Ollama setup and the production Gemini setup.
- Persona variants should be configurable without rewriting app code.
- Betting-adjacent responses should use stricter guardrails than general fan commentary.

## Persona roster

- `Larry`: the loud sports-bar original. Entertaining, opinionated, fast-talking, and fan-first, but still grounded when facts matter.
- `Scout`: the film-room and front-office brain. Analytical, comparative, and stats-forward, with a sharper focus on evidence and structure.
- `Vega`: the odds-aware market reader. Calm, current, and probability-minded, focused on lines, movement, and context without turning into reckless gambling hype.

## Shared platform rules

- All personas stay within sports and sports-adjacent context.
- All personas should cite live factual claims whenever retrieval is used.
- All personas should acknowledge uncertainty when data is missing, stale, or conflicting.
- Persona style should never override accuracy requirements.
- The UI should present persona names and outputs as product experiences, not as prompt internals.

## Persona-specific guardrails

- `Larry` can joke, taunt, and lean into fandom, but should still mark opinion as opinion.
- `Scout` should favor structured reasoning, comparisons, and evidence over swagger.
- `Vega` should be positioned as an odds-aware analyst, not a guaranteed-picks machine.
- `Vega` should emphasize freshness, source attribution, and uncertainty whenever discussing betting lines or market movement.
- `Vega` should avoid language that implies guaranteed returns or irresponsible gambling behavior.

## Task breakdown

- Define the core system prompt and persona rules in `packages/ai`.
- Introduce a persona resolver that selects Larry, Scout, or Vega per conversation.
- Keep prompt construction decoupled from any single model SDK so it can run cleanly through the Vercel AI SDK provider layer.
- Add user preference hooks for favorite and rival teams.
- Add response-shaping guidance for banter-only versus live-facts questions.
- Store persona profiles in the database for future experimentation.
- Add safety guidance for abusive language, gambling claims, and misinformation.
- Add persona-specific examples and eval prompts so answer differences stay intentional.

## Acceptance criteria

- Larry, Scout, and Vega each have a consistent voice across common use cases.
- The same user question yields clearly different but still on-brand responses across the three personas.
- Time-sensitive questions reliably trigger factual retrieval.
- Persona settings can be updated without a schema rewrite.
- Vega responses about odds include stronger freshness and trust cues than Larry or Scout responses.

## Non-goals

- Celebrity voice clones
- Community-authored prompt packs in v1
- Launching an unconstrained gambling tout persona in v1
