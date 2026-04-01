# Search And Live Data

## Goal

Give Larry, Scout, and Vega access to fresh sports facts and narrative context so time-sensitive answers stay current, inspectable, and citation-backed.

## MVP scope

- Web search provider abstraction
- Structured sports-data provider abstraction
- Query normalization, result ranking, and citation formatting
- Search query and result persistence for debugging and analytics
- Persona-aware retrieval emphasis for fan, analytical, and odds-aware answers
- Freshness and attribution rules for odds-oriented answers

## Current status

- Completed: Tavily-backed web retrieval is wired for narrative context and breaking sports coverage
- Completed: ESPN-backed structured retrieval is wired for scoreboards and standings
- Completed: live-search intent triggers retrieval before answer generation on time-sensitive prompts
- Completed: search queries, results, citations, provider events, and usage rows persist for inspection
- Completed: assistant answers render citation pills in the transcript
- Completed: merged search results now rank structured live facts ahead of less-relevant narrative coverage for time-sensitive prompts
- Completed: retrieved answers can reference inline numbered citations that map to transcript sources
- Remaining: structured injuries and odds adapters and persona-specific freshness behavior for analytical and odds-aware answers

## Requirements

- Larry, Scout, and Vega automatically use live retrieval for scores, schedules, standings, odds, injuries, and breaking news when needed.
- Search and data-provider failures are visible and recoverable.
- Factual claims sourced from live providers can be cited in the chat UI.
- The system can mix narrative articles with structured sports feeds.
- `Scout` should prioritize structured stats, standings, and trend-friendly data whenever available.
- `Vega` should present odds, line movement context, and market-relevant facts with source attribution and freshness timestamps.
- If odds are unavailable or stale, `Vega` should say so explicitly instead of implying confidence.

## Persona-specific retrieval emphasis

- `Larry`: balances breaking news, scoreboards, and narrative articles to support fan-first answers with cited facts.
- `Scout`: prefers structured scoreboards, standings, team stats, and comparison-friendly sources before leaning on broader narrative coverage.
- `Vega`: prefers odds feeds, market movement, injury news, and lineup context, with stricter sourcing and freshness requirements than the other personas.

## Task breakdown

- Define provider contracts in `packages/search`.
- Add intent rules for when live search is mandatory.
- Persist search queries, results, and selected citations.
- Normalize result types across article, score, standings, injury, and odds sources.
- Add citation rendering in assistant messages.
- Add structured injuries and odds providers or feeds.
- Add persona-aware ranking and response-shaping hooks for Larry, Scout, and Vega.
- Upgrade citation UX from pills-only to inline references tied to transcript content.
- Add freshness timestamps and explicit stale-data fallback states for odds-oriented answers.

## Acceptance criteria

- A live sports question triggers retrieval before answer generation.
- The assistant can cite at least one source for live factual answers.
- Search traces are visible in the database for inspection.
- Scout answers feel more evidence-led and stats-oriented than Larry answers on the same topic.
- Vega answers include source attribution and freshness context for odds-oriented claims, or explicitly state when that context is unavailable.

## Non-goals

- Full historical stats warehouse
- In-house sports crawler in v1
- Unattributed or timestamp-free odds guidance in v1
