import { recordModelProviderEvent } from '$lib/server/chat-store'
import { db } from '$lib/server/db'
import { billingEvent, plan, userEntitlement } from '@larry/db/schema'
import { Polar } from '@polar-sh/sdk'
import { desc, eq } from 'drizzle-orm'

type PaidPlanSlug = 'pro' | 'pulse'

const paidPlanSlugs = ['pro', 'pulse'] as const satisfies PaidPlanSlug[]

function getPolarServer() {
	return process.env.POLAR_SERVER === 'production' ? 'production' : 'sandbox'
}

function getPolarClient() {
	const accessToken = process.env.POLAR_ACCESS_TOKEN

	if (!accessToken) {
		throw new Error('POLAR_ACCESS_TOKEN is required for Polar billing actions.')
	}

	return new Polar({
		accessToken,
		server: getPolarServer(),
	})
}

function getPolarProductIdForPlanSlug(planSlug: PaidPlanSlug) {
	if (planSlug === 'pro') {
		return process.env.POLAR_PRODUCT_ID_PRO ?? null
	}

	return process.env.POLAR_PRODUCT_ID_PULSE ?? null
}

function getPlanSlugForPolarProductId(productId: string | null | undefined) {
	if (!productId) {
		return null
	}

	return paidPlanSlugs.find((slug) => getPolarProductIdForPlanSlug(slug) === productId) ?? null
}

function getFreePlanId() {
	return 'free'
}

async function getLatestEntitlement(userId: string) {
	const [entitlement] = await db
		.select()
		.from(userEntitlement)
		.where(eq(userEntitlement.userId, userId))
		.orderBy(desc(userEntitlement.startsAt), desc(userEntitlement.createdAt))
		.limit(1)

	return entitlement ?? null
}

async function persistBillingEvent(input: {
	eventName: string
	payload: unknown
	providerEventId: string
	userId?: string | null
	stage: 'checkout-sync' | 'webhook'
}) {
	await db
		.insert(billingEvent)
		.values({
			eventName: input.eventName,
			payload: input.payload as Record<string, unknown>,
			processedAt: new Date(),
			providerEventId: input.providerEventId,
		})
		.onConflictDoNothing()

	await recordBillingProviderEvent({
		eventName: input.eventName,
		payload: {
			stage: input.stage,
			userId: input.userId ?? null,
		},
		referenceId: input.providerEventId,
	})
}

export async function recordBillingProviderEvent(input: {
	eventName: string
	payload: Record<string, unknown>
	referenceId?: string | null
}) {
	await recordModelProviderEvent({
		payload: {
			eventName: input.eventName,
			...input.payload,
		},
		providerKind: 'billing',
		providerName: `polar-${getPolarServer()}`,
		referenceId: input.referenceId ?? null,
	})
}

async function upsertEntitlementFromPolarState(input: {
	customerState: {
		activeSubscriptions: Array<{
			currentPeriodEnd: Date
			id: string
			productId: string
			startedAt: Date | null
			status: string
		}>
		id: string
	}
	userId: string
}) {
	const latestEntitlement = await getLatestEntitlement(input.userId)
	const activeSubscription = input.customerState.activeSubscriptions[0] ?? null
	const resolvedPlanId = activeSubscription
		? (getPlanSlugForPolarProductId(activeSubscription.productId) ?? getFreePlanId())
		: getFreePlanId()
	const entitlementStatus: 'active' | 'cancelled' | 'free' | 'trialing' = activeSubscription
		? activeSubscription.status === 'trialing'
			? 'trialing'
			: 'active'
		: latestEntitlement?.polarSubscriptionId
			? 'cancelled'
			: 'free'
	const startsAt = activeSubscription?.startedAt ?? latestEntitlement?.startsAt ?? new Date()
	const endsAt = activeSubscription?.currentPeriodEnd ?? latestEntitlement?.endsAt ?? null

	if (latestEntitlement) {
		await db
			.update(userEntitlement)
			.set({
				endsAt,
				planId: resolvedPlanId,
				polarCustomerId: input.customerState.id,
				polarSubscriptionId: activeSubscription?.id ?? null,
				startsAt,
				status: entitlementStatus,
				updatedAt: new Date(),
			})
			.where(eq(userEntitlement.id, latestEntitlement.id))

		return
	}

	await db.insert(userEntitlement).values({
		endsAt,
		planId: resolvedPlanId,
		polarCustomerId: input.customerState.id,
		polarSubscriptionId: activeSubscription?.id ?? null,
		startsAt,
		status: entitlementStatus,
		userId: input.userId,
	})
}

export function isPaidPlanSlug(planSlug: string): planSlug is PaidPlanSlug {
	return paidPlanSlugs.includes(planSlug as PaidPlanSlug)
}

export function getCheckoutPathForPlan(planSlug: string) {
	return isPaidPlanSlug(planSlug) && getPolarProductIdForPlanSlug(planSlug)
		? `/api/billing/checkout/${planSlug}`
		: null
}

export function getAvailableCheckoutPaths() {
	return {
		pro: getCheckoutPathForPlan('pro'),
		pulse: getCheckoutPathForPlan('pulse'),
	} as const
}

export function isPolarCheckoutEnabled() {
	return (
		Boolean(process.env.POLAR_ACCESS_TOKEN) &&
		paidPlanSlugs.some((slug) => Boolean(getPolarProductIdForPlanSlug(slug)))
	)
}

export async function createPolarCheckoutForPlan(input: {
	origin: string
	planSlug: PaidPlanSlug
	user: {
		email: string
		id: string
		name: string
	}
}) {
	const productId = getPolarProductIdForPlanSlug(input.planSlug)

	if (!productId) {
		throw new Error(`Polar product ID is missing for ${input.planSlug}.`)
	}

	const checkout = await getPolarClient().checkouts.create({
		customerEmail: input.user.email,
		customerName: input.user.name,
		externalCustomerId: input.user.id,
		metadata: {
			planSlug: input.planSlug,
			userId: input.user.id,
		},
		products: [productId],
		returnUrl: `${input.origin}/account#billing`,
		successUrl: `${input.origin}/account?checkout=success&checkout_id={CHECKOUT_ID}`,
	})

	return checkout
}

export async function syncPolarCustomerStateByExternalId(input: {
	reason: 'checkout-return' | 'manual-sync' | 'webhook'
	userId: string
}) {
	const customerState = await getPolarClient().customers.getStateExternal({
		externalId: input.userId,
	})

	await upsertEntitlementFromPolarState({
		customerState,
		userId: input.userId,
	})

	await persistBillingEvent({
		eventName: 'customer.state_synced',
		payload: {
			activeSubscriptionCount: customerState.activeSubscriptions.length,
			reason: input.reason,
			userId: input.userId,
		},
		providerEventId: `${input.reason}:${input.userId}:${customerState.id}`,
		stage: input.reason === 'webhook' ? 'webhook' : 'checkout-sync',
		userId: input.userId,
	})

	return customerState
}

export async function syncPolarCheckoutForUser(input: { checkoutId: string; userId: string }) {
	const checkout = await getPolarClient().checkouts.get({ id: input.checkoutId })

	if (checkout.externalCustomerId && checkout.externalCustomerId !== input.userId) {
		throw new Error('Checkout session does not belong to the signed-in user.')
	}

	if (checkout.status === 'succeeded') {
		await syncPolarCustomerStateByExternalId({
			reason: 'checkout-return',
			userId: input.userId,
		})
	}

	await persistBillingEvent({
		eventName: `checkout.${checkout.status}`,
		payload: {
			checkoutId: checkout.id,
			status: checkout.status,
			userId: input.userId,
		},
		providerEventId: `checkout:${checkout.id}`,
		stage: 'checkout-sync',
		userId: input.userId,
	})

	return checkout
}

export async function applyPolarCustomerStateWebhook(input: {
	payload: {
		data: {
			activeSubscriptions: Array<{
				currentPeriodEnd: Date
				id: string
				productId: string
				startedAt: Date | null
				status: string
			}>
			externalId?: string | null
			id: string
		}
		type: 'customer.state_changed'
	}
	providerEventId: string
}) {
	const userId = input.payload.data.externalId

	if (!userId) {
		await persistBillingEvent({
			eventName: input.payload.type,
			payload: input.payload,
			providerEventId: input.providerEventId,
			stage: 'webhook',
		})

		return
	}

	await upsertEntitlementFromPolarState({
		customerState: input.payload.data,
		userId,
	})

	await persistBillingEvent({
		eventName: input.payload.type,
		payload: input.payload,
		providerEventId: input.providerEventId,
		stage: 'webhook',
		userId,
	})
}

export async function hasProcessedBillingEvent(providerEventId: string) {
	const [existingEvent] = await db
		.select({ id: billingEvent.id })
		.from(billingEvent)
		.where(eq(billingEvent.providerEventId, providerEventId))
		.limit(1)

	return Boolean(existingEvent)
}

export async function getCurrentPlanRecord(planSlug: string) {
	const [planRecord] = await db.select().from(plan).where(eq(plan.slug, planSlug)).limit(1)
	return planRecord ?? null
}
