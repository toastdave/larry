# Authentication And Accounts

## Goal

Launch a flexible account system that supports guest entry today and durable preferences, billing, and saved conversations later.

## MVP scope

- Email and password auth
- Google and GitHub OAuth support
- Protected account and chat routes
- Initial account profile surface for billing and preferences follow-on work

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
