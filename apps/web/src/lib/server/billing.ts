import {
	type BillingGateReason,
	type BillingUsageSummary,
	assessChatUsageGate,
	getRecommendedUpgrade,
	summarizeUsage,
	tallyUsageEntries,
} from '$lib/billing'
import { db } from '$lib/server/db'
import { plan, usageLedger, userEntitlement } from '@larry/db/schema'
import { requiresFreshSearch } from '@larry/search'
import { and, asc, desc, eq, gte, lt } from 'drizzle-orm'

type PlanRecord = typeof plan.$inferSelect

export type BillingSnapshot = {
	currentPlan: PlanRecord
	entitlementStatus: 'active' | 'cancelled' | 'free' | 'past_due' | 'trialing'
	nextPlan: PlanRecord | null
	plans: PlanRecord[]
	usage: {
		messages: BillingUsageSummary
		searches: BillingUsageSummary
		windowLabel: string
	}
}

export type ChatBillingAccess = BillingSnapshot & {
	allowed: boolean
	blockedReason: BillingGateReason | null
	promptRequiresSearch: boolean
	statusMessage: string | null
}

function getWindowRange() {
	const now = new Date()
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

	return {
		end,
		label: new Intl.DateTimeFormat('en-US', {
			month: 'short',
			year: 'numeric',
		}).format(start),
		start,
	}
}

export async function loadBillingSnapshotForUser(userId: string): Promise<BillingSnapshot> {
	const { end, label, start } = getWindowRange()

	const [plans, entitlement, monthlyUsage] = await Promise.all([
		db.select().from(plan).orderBy(asc(plan.monthlyPriceCents)),
		db
			.select({
				entitlementStatus: userEntitlement.status,
				plan,
			})
			.from(userEntitlement)
			.innerJoin(plan, eq(plan.id, userEntitlement.planId))
			.where(eq(userEntitlement.userId, userId))
			.orderBy(desc(userEntitlement.startsAt), desc(userEntitlement.createdAt))
			.limit(1)
			.then((rows) => rows[0] ?? null),
		db
			.select({
				entryType: usageLedger.entryType,
				units: usageLedger.units,
			})
			.from(usageLedger)
			.where(
				and(
					eq(usageLedger.userId, userId),
					gte(usageLedger.createdAt, start),
					lt(usageLedger.createdAt, end)
				)
			),
	])

	const freePlan = plans.find((entry) => entry.slug === 'free') ?? plans[0]

	if (!freePlan) {
		throw new Error('Billing plans are not seeded.')
	}

	const currentPlan = entitlement?.plan ?? freePlan
	const usageTotals = tallyUsageEntries(monthlyUsage)
	const usage = {
		messages: summarizeUsage({
			included: currentPlan.monthlyIncludedMessages,
			label: 'messages',
			used: usageTotals.messages,
		}),
		searches: summarizeUsage({
			included: currentPlan.monthlyIncludedSearches,
			label: 'live lookups',
			used: usageTotals.searches,
		}),
		windowLabel: label,
	}

	return {
		currentPlan,
		entitlementStatus: entitlement?.entitlementStatus ?? 'free',
		nextPlan: getRecommendedUpgrade(plans, currentPlan.slug),
		plans,
		usage,
	}
}

export async function loadPublicBillingSnapshot(): Promise<BillingSnapshot> {
	const { label } = getWindowRange()
	const plans = await db.select().from(plan).orderBy(asc(plan.monthlyPriceCents))
	const freePlan = plans.find((entry) => entry.slug === 'free') ?? plans[0]

	if (!freePlan) {
		throw new Error('Billing plans are not seeded.')
	}

	return {
		currentPlan: freePlan,
		entitlementStatus: 'free',
		nextPlan: getRecommendedUpgrade(plans, freePlan.slug),
		plans,
		usage: {
			messages: summarizeUsage({
				included: freePlan.monthlyIncludedMessages,
				label: 'messages',
				used: 0,
			}),
			searches: summarizeUsage({
				included: freePlan.monthlyIncludedSearches,
				label: 'live lookups',
				used: 0,
			}),
			windowLabel: label,
		},
	}
}

export async function loadChatBillingAccessForUser(input: {
	prompt: string
	userId: string
}): Promise<ChatBillingAccess> {
	const snapshot = await loadBillingSnapshotForUser(input.userId)
	const promptRequiresSearch = requiresFreshSearch(input.prompt)
	const gate = assessChatUsageGate({
		messages: snapshot.usage.messages,
		requiresSearch: promptRequiresSearch,
		searches: snapshot.usage.searches,
	})

	if (gate.allowed) {
		return {
			...snapshot,
			allowed: true,
			blockedReason: null,
			promptRequiresSearch,
			statusMessage: null,
		}
	}

	const statusMessage =
		gate.reason === 'messages'
			? `${snapshot.currentPlan.name} is out of chat messages for ${snapshot.usage.windowLabel}. Upgrade or wait for the monthly reset before firing off another take.`
			: `${snapshot.currentPlan.name} is out of live lookups for ${snapshot.usage.windowLabel}. You can still ask non-live takes, but this prompt needs fresh search before Larry can answer it responsibly.`

	return {
		...snapshot,
		allowed: false,
		blockedReason: gate.reason,
		promptRequiresSearch,
		statusMessage,
	}
}
