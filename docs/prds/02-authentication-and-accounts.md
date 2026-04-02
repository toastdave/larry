# Authentication And Accounts

## Goal

Launch a flexible account system that supports guest entry today and durable preferences, billing, and saved conversations later.

## MVP scope

- Email and password auth
- Google and GitHub OAuth support
- Protected account and chat routes
- Initial account profile surface for billing and preferences follow-on work

## Current status

- Completed: Better Auth is wired to Drizzle tables and SvelteKit hooks
- Completed: sign-in, sign-up, account, and protected chat routes are live
- Completed: OAuth providers can be toggled by environment configuration without code changes
- Completed: account settings now let users save favorite and rival teams for persona-aware chat context
- Completed: account now shows current entitlement state, monthly usage, and plan-upgrade messaging from the seeded billing model
- Completed: account now exposes Polar sandbox checkout entry points and return-state messaging for billing flows
- Completed: account now supports display-name editing without leaving the main settings surface
- Completed: account now supports avatar URL editing and preview so the user identity can surface in the main app chrome
- Completed: guest mode can now open the chat shell, browse personas, and route users into auth when they want live answers and saved history
- Remaining: richer profile editing beyond the core display name and avatar fields

## Requirements

- Users can create accounts and sign in with low friction.
- Session state is available server-side for protected routes.
- The account model is ready for team preferences and monetization entitlements.
- Redirect flows preserve the user's intended destination.

## Task breakdown

- Wire Better Auth to Drizzle tables and SvelteKit hooks.
- Add sign-up and sign-in routes with SSR-aware redirects.
- Protect account and chat routes.
- Add account summary UI for email, session, and future plan details.
- Add placeholder guest-mode rules and upgrade prompts.

## Acceptance criteria

- Email/password auth works locally.
- OAuth providers can be enabled by environment variables without code changes.
- Protected routes redirect unauthenticated users to sign in.

## Non-goals

- Full profile editing UI
- Enterprise SSO in v1
