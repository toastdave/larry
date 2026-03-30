# Billing And Monetization

## Goal

Launch a hybrid monetization system that keeps inference costs sustainable without making the product feel stingy or transactional.

## MVP scope

- Free, Pro, and Pulse plan definitions
- Usage ledger for inference and search cost tracking
- Entitlement model for subscriptions and overage support
- Checkout and webhook hooks for Polar integration
- Polar sandbox validation before live billing is enabled

## Requirements

- The app can distinguish free usage from paid entitlements.
- Search and inference costs are traceable at the user and message level.
- Subscription access and future credit packs can coexist.
- Monetization rules do not break the core chat experience.
- Local development, Polar sandbox, and live production billing are treated as separate environments.

## Task breakdown

- Finalize plan, entitlement, usage-ledger, and billing-event schema.
- Seed baseline plans with included chat and search allowances.
- Define overage policy and future credit-pack behavior.
- Add checkout and webhook PRD tasks for Polar.
- Validate subscription checkout, webhook replay, and entitlement sync in Polar sandbox before enabling live billing.
- Add product messaging for upgrade prompts and limit states.

## Acceptance criteria

- Plan definitions exist in the database and seed successfully.
- Usage records can capture both inference and retrieval cost metadata.
- The system can support subscription-first access with metered fallback.
- The subscription upgrade path can be exercised in Polar sandbox without real-money transactions.

## Non-goals

- Ad-hoc manual invoicing
- Complex enterprise seat billing in v1
