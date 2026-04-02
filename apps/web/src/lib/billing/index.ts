export type BillingUsageSummary = {
	included: number
	label: string
	overLimit: boolean
	remaining: number
	used: number
	usageRatio: number
	warningLevel: 'healthy' | 'limit' | 'watch'
}

export type BillingGateReason = 'messages' | 'searches'

export type UsageLedgerSummaryEntry = {
	entryType: string
	units: number
}

type PlanLike = {
	slug: string
}

export function formatPlanPrice(monthlyPriceCents: number) {
	if (monthlyPriceCents <= 0) {
		return 'Free'
	}

	return `$${(monthlyPriceCents / 100).toFixed(0)}/mo`
}

export function humanizeFeatureFlag(flag: string) {
	return flag
		.replace(/([a-z])([A-Z])/g, '$1 $2')
		.replace(/[-_]/g, ' ')
		.replace(/\b\w/g, (character) => character.toUpperCase())
}

export function summarizeUsage(input: {
	included: number
	label: string
	used: number
}): BillingUsageSummary {
	const remaining = Math.max(input.included - input.used, 0)
	const usageRatio = input.included > 0 ? input.used / input.included : 0
	const warningLevel = usageRatio >= 1 ? 'limit' : usageRatio >= 0.75 ? 'watch' : 'healthy'

	return {
		included: input.included,
		label: input.label,
		overLimit: input.used > input.included,
		remaining,
		used: input.used,
		usageRatio,
		warningLevel,
	}
}

export function tallyUsageEntries(entries: UsageLedgerSummaryEntry[]) {
	return entries.reduce(
		(result, entry) => {
			if (entry.entryType === 'inference') {
				result.messages += entry.units
			}

			if (entry.entryType === 'search') {
				result.searches += 1
			}

			return result
		},
		{ messages: 0, searches: 0 }
	)
}

export function assessChatUsageGate(input: {
	messages: BillingUsageSummary
	requiresSearch: boolean
	searches: BillingUsageSummary
}) {
	if (input.messages.remaining <= 0) {
		return {
			allowed: false,
			reason: 'messages' as BillingGateReason,
		}
	}

	if (input.requiresSearch && input.searches.remaining <= 0) {
		return {
			allowed: false,
			reason: 'searches' as BillingGateReason,
		}
	}

	return {
		allowed: true,
		reason: null,
	}
}

export function getRecommendedUpgrade<T extends PlanLike>(plans: T[], currentPlanSlug: string) {
	const currentIndex = plans.findIndex((entry) => entry.slug === currentPlanSlug)

	if (currentIndex < 0) {
		return plans[0] ?? null
	}

	return plans[currentIndex + 1] ?? null
}
