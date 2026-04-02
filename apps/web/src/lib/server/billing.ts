import { type BillingUsageSummary, getRecommendedUpgrade, summarizeUsage } from '$lib/billing'
import { db } from '$lib/server/db'
import { plan, usageLedger, userEntitlement } from '@larry/db/schema'
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
	const usageTotals = monthlyUsage.reduce(
		(result, entry) => {
			if (entry.entryType === 'inference') {
				result.messages += entry.units
			}

			if (entry.entryType === 'search') {
				result.searches += entry.units
			}

			return result
		},
		{ messages: 0, searches: 0 }
	)

	return {
		currentPlan,
		entitlementStatus: entitlement?.entitlementStatus ?? 'free',
		nextPlan: getRecommendedUpgrade(plans, currentPlan.slug),
		plans,
		usage: {
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
		},
	}
}
