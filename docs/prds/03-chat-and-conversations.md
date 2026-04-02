# Chat And Conversations

## Goal

Create a sports chat experience that feels conversational, fast, and personality-driven while letting users choose between distinct sports personas and preserve that context across sessions.

## MVP scope

- Conversation and message persistence
- Streaming chat route and message lifecycle through the Vercel AI SDK
- Chat shell with starter prompts and saved history hooks
- Message part support for text, tool calls, and citations
- Persona picker for new conversations
- Conversation-level persona persistence for Larry, Scout, and Vega

## Current status

- Completed: authenticated users can create, revisit, and continue saved conversations
- Completed: user and assistant turns persist, stream into the UI, and survive refreshes
- Completed: chat transport now runs through the Vercel AI SDK with environment-based provider routing
- Completed: chat UI includes starter prompts, optimistic updates, history, loading states, and saved transcript rendering
- Completed: users can start fresh conversations with Larry, Scout, or Vega and keep that persona attached to the thread
- Completed: assistant answers now support inline numbered citation references alongside transcript source cards
- Completed: unsafe prompts now return explicit in-thread safety replies instead of silently relying on the model prompt alone
- Completed: saved conversation history now supports title search and persona filtering in the chat sidebar
- Completed: new conversations now get cleaner, more headline-style auto titles instead of raw first-prompt text

## Requirements

- Users can start and continue conversations across sessions.
- Users can choose a persona when starting a new conversation.
- The chosen persona is stored at the conversation level so revisits stay stylistically and contextually consistent.
- The UI clearly distinguishes user turns, persona turns, and supporting citations.
- The persistence model can store tool activity and persona metadata without redesigning the message schema later.
- The chat transport is provider-agnostic so local development can use Ollama and hosted environments can use Gemini.
- Mobile and desktop chat layouts both feel first-class.

## Persona definitions

- `Larry`: loud, funny, fan-first, and conversational while still grounding factual claims in cited sources.
- `Scout`: analytical, stats-forward, and more measured, with a stronger focus on trends, comparisons, and evidence-led breakdowns.
- `Vega`: odds-aware and market-literate, focused on line context, price movement, and betting-relevant framing with stricter freshness and attribution rules.

## Conversation behavior

- Persona selection happens when the user creates a new conversation.
- Each conversation stays tied to its persona for its lifetime in MVP.
- Changing persona means starting a new conversation rather than switching tone mid-thread.
- Starter prompts, empty states, and suggested follow-ups should reflect the active persona.
- Saved conversation history should surface the active persona with a badge or label.

## Task breakdown

- Finalize conversation, message, and message-part schema ownership.
- Add conversation-level persona selection and persistence.
- Build the initial Vercel AI SDK streaming endpoint and chat composer.
- Persist user and assistant turns together with message metadata.
- Add environment-based model routing defaults for Ollama locally and Gemini in preview and production.
- Add persona-aware starter prompts, empty states, and history surfaces.
- Track conversation titles, personas, and last activity timestamps.

## Acceptance criteria

- A signed-in user can create and revisit conversations.
- A signed-in user can select Larry, Scout, or Vega when starting a conversation.
- Message persistence survives refreshes and new sessions.
- Conversation persona persists and remains visible when a user revisits a thread.
- The chat route streams responses through the Vercel AI SDK and can swap providers by environment configuration.
- The chat shell handles empty, loading, success, and error states.
- The same sports question should produce meaningfully different answers when asked in separate Larry, Scout, and Vega conversations.

## Non-goals

- Group chats in v1
- Voice input and output in v1
- Per-message persona switching within the same conversation in v1
