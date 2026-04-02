# Billing And Monetization

## Goal

Launch a hybrid monetization system that keeps inference costs sustainable without making the product feel stingy or transactional.

## MVP scope

- Free, Pro, and Pulse plan definitions
- Usage ledger for inference and search cost tracking
- Entitlement model for subscriptions and overage support
- Checkout and webhook hooks for Polar integration
- Polar sandbox validation before live billing is enabled

## Current status

- Completed: billing schema, seeded plans, entitlement primitives, and usage-ledger tables exist
- Completed: chat inference and live retrieval both write usage rows for future plan enforcement
- Completed: Polar sandbox workflow is documented for future integration work
- Completed: account and chat now surface seeded-plan usage, current entitlement state, and upgrade messaging in-product
- Completed: Polar sandbox checkout routes, return-state sync, and webhook entitlement syncing are now wired into the app
- Completed: hard chat-message and live-lookup enforcement now blocks over-limit chat turns while keeping upgrade paths visible in product
- Completed: MVP packaging keeps Larry, Scout, and Vega available across all plans, with paid tiers expanding usage runway instead of locking personas behind plan walls

## Requirements

- The app can distinguish free usage from paid entitlements.
- Search and inference costs are traceable at the user and message level.
- Subscription access and future credit packs can coexist.
- Monetization rules do not break the core chat experience.
- Local development, Polar sandbox, and live production billing are treated as separate environments.
- Multi-persona product architecture should not depend on billing enforcement before the personas can launch.
- Persona access can become an entitlement later, but the initial PRD direction should treat persona support as a product capability first.

## Task breakdown

- Finalize plan, entitlement, usage-ledger, and billing-event schema.
- Seed baseline plans with included chat and search allowances.
- Define overage policy and future credit-pack behavior.
- Add checkout and webhook PRD tasks for Polar.
- Validate subscription checkout, webhook replay, and entitlement sync in Polar sandbox before enabling live billing.
- Add product messaging for upgrade prompts and limit states.
- Decide separately whether Scout and Vega become paid entitlements, premium defaults, or broadly available personas after product validation.

## Acceptance criteria

- Plan definitions exist in the database and seed successfully.
- Usage records can capture both inference and retrieval cost metadata.
- The system can support subscription-first access with metered fallback.
- The subscription upgrade path can be exercised in Polar sandbox without real-money transactions.

## Non-goals

- Ad-hoc manual invoicing
- Complex enterprise seat billing in v1
