# Observability And Operations

## Goal

Make every retrieval and response path inspectable enough that product, support, and engineering can explain what Larry did and why.

## MVP scope

- Provider event tracking
- Search query and result traces
- Usage logging for model and search cost
- Runbook-ready error visibility

## Current status

- Completed: provider events persist for AI and search paths
- Completed: search traces and usage-ledger rows are stored per conversation and message
- Completed: metadata captures whether a response came from the local or hosted AI route
- Completed: billing-limit blocks now emit provider events so support can explain why a chat turn was rejected
- Remaining: operational runbooks, dashboarding, alerting, and explicit incident procedures for provider outages

## Requirements

- Failed tool calls are inspectable after the fact.
- Support can trace a bad answer back to the underlying retrieval and provider metadata.
- Provider metadata captures the active AI SDK route, including whether a response came from local Ollama or hosted Gemini.
- Billing-impacting events are reviewable.
- The system has enough metadata to diagnose latency and reliability issues.

## Task breakdown

- Define provider event taxonomy and persistence rules.
- Store retrieval requests, tool calls, and usage ledger events.
- Add log correlation between message, tool, and provider identifiers.
- Document separate runbooks for local Ollama issues, Gemini provider outages, and environment-based provider cutovers.
- Document operational runbooks for provider outages, local Docker lifecycle, Tailscale Serve setup, and billing mismatches.

## Acceptance criteria

- A failed live-data answer can be traced from the UI to the stored provider event.
- Usage anomalies can be investigated through stored ledger rows.
- Operators can tell which provider and model path served a response in each environment.
- The launch checklist includes response, retrieval, and billing debugging steps.

## Non-goals

- Full enterprise SIEM integration
- Multi-region observability rollout in v1
