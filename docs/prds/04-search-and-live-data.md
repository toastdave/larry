# Search And Live Data

## Goal

Give Larry access to fresh sports facts and narrative context so time-sensitive answers stay current, inspectable, and citation-backed.

## MVP scope

- Web search provider abstraction
- Structured sports-data provider abstraction
- Query normalization, result ranking, and citation formatting
- Search query and result persistence for debugging and analytics

## Requirements

- Larry automatically uses live retrieval for scores, schedules, standings, odds, injuries, and breaking news.
- Search and data-provider failures are visible and recoverable.
- Factual claims sourced from live providers can be cited in the chat UI.
- The system can mix narrative articles with structured sports feeds.

## Task breakdown

- Define provider contracts in `packages/search`.
- Add intent rules for when live search is mandatory.
- Persist search queries, results, and selected citations.
- Normalize result types across article, score, standings, injury, and odds sources.
- Add citation rendering in assistant messages.

## Acceptance criteria

- A live sports question triggers retrieval before answer generation.
- The assistant can cite at least one source for live factual answers.
- Search traces are visible in the database for inspection.

## Non-goals

- Full historical stats warehouse
- In-house sports crawler in v1
