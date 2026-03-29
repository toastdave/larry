# Chat And Conversations

## Goal

Create a sports chat experience that feels conversational, fast, and personality-driven while preserving conversation state and future tool traces.

## MVP scope

- Conversation and message persistence
- Streaming chat route and message lifecycle through the Vercel AI SDK
- Chat shell with starter prompts and saved history hooks
- Message part support for text, tool calls, and citations

## Requirements

- Users can start and continue conversations across sessions.
- The UI clearly distinguishes user turns, Larry turns, and supporting citations.
- The persistence model can store tool activity without redesigning the message schema later.
- The chat transport is provider-agnostic so local development can use Ollama and hosted environments can use Gemini.
- Mobile and desktop chat layouts both feel first-class.

## Task breakdown

- Finalize conversation, message, and message-part schema ownership.
- Build the initial Vercel AI SDK streaming endpoint and chat composer.
- Persist user and assistant turns together with message metadata.
- Add environment-based model routing defaults for Ollama locally and Gemini in preview and production.
- Add starter prompts, empty states, and history surfaces.
- Track conversation titles and last activity timestamps.

## Acceptance criteria

- A signed-in user can create and revisit conversations.
- Message persistence survives refreshes and new sessions.
- The chat route streams responses through the Vercel AI SDK and can swap providers by environment configuration.
- The chat shell handles empty, loading, success, and error states.

## Non-goals

- Group chats in v1
- Voice input and output in v1
