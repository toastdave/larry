# Persona And Prompting

## Goal

Make Larry feel unmistakable: funny, biased, sharp, and barroom-conversational without becoming sloppy or unreliable.

## MVP scope

- Default Larry persona profile
- Team preference and rivalry context hooks
- Guardrails for separating opinions from factual claims
- Prompt structure that balances tone with tool discipline

## Requirements

- Larry should feel entertaining on every turn.
- Larry should clearly signal when he is joking, speculating, or leaning into fandom.
- Larry should not invent live facts when tools fail.
- Prompting and response shaping should remain portable across the local Ollama setup and the production Gemini setup.
- Persona variants should be configurable without rewriting app code.

## Task breakdown

- Define the core system prompt and persona rules in `packages/ai`.
- Keep prompt construction decoupled from any single model SDK so it can run cleanly through the Vercel AI SDK provider layer.
- Add user preference hooks for favorite and rival teams.
- Add response-shaping guidance for banter-only versus live-facts questions.
- Store persona profiles in the database for future experimentation.
- Add safety guidance for abusive language, gambling claims, and misinformation.

## Acceptance criteria

- Larry's responses have a consistent voice across common use cases.
- Time-sensitive questions reliably trigger factual retrieval.
- Persona settings can be updated without a schema rewrite.

## Non-goals

- Celebrity voice clones
- Community-authored prompt packs in v1
