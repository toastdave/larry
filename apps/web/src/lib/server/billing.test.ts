import { describe, expect, test } from 'bun:test'
import {
	assessChatUsageGate,
	formatPlanPrice,
	getRecommendedUpgrade,
	humanizeFeatureFlag,
	summarizeUsage,
	tallyUsageEntries,
} from '$lib/billing'

const plans = [
	{
		annualPriceCents: 0,
		createdAt: new Date(),
		featureFlags: {},
		id: 'free',
		monthlyIncludedMessages: 40,
		monthlyIncludedSearches: 25,
		monthlyPriceCents: 0,
		name: 'Free',
		slug: 'free',
		updatedAt: new Date(),
	},
	{
		annualPriceCents: 19000,
		createdAt: new Date(),
		featureFlags: {},
		id: 'pro',
		monthlyIncludedMessages: 400,
		monthlyIncludedSearches: 250,
		monthlyPriceCents: 1900,
		name: 'Pro',
		slug: 'pro',
		updatedAt: new Date(),
	},
] as const

describe('billing helpers', () => {
	test('formats plan prices for account ui', () => {
		expect(formatPlanPrice(0)).toBe('Free')
		expect(formatPlanPrice(1900)).toBe('$19/mo')
	})

	test('humanizes feature flags for plan chips', () => {
		expect(humanizeFeatureFlag('prioritySearch')).toBe('Priority Search')
	})

	test('summarizes usage against monthly limits', () => {
		expect(summarizeUsage({ included: 40, label: 'messages', used: 34 })).toEqual({
			included: 40,
			label: 'messages',
			overLimit: false,
			remaining: 6,
			used: 34,
			usageRatio: 0.85,
			warningLevel: 'watch',
		})
	})

	test('counts live lookups per search query instead of result rows', () => {
		expect(
			tallyUsageEntries([
				{ entryType: 'inference', units: 1 },
				{ entryType: 'search', units: 6 },
				{ entryType: 'search', units: 3 },
			])
		).toEqual({
			messages: 1,
			searches: 2,
		})
	})

	test('blocks chat when the monthly message cap is exhausted', () => {
		expect(
			assessChatUsageGate({
				messages: summarizeUsage({ included: 40, label: 'messages', used: 40 }),
				requiresSearch: false,
				searches: summarizeUsage({ included: 25, label: 'live lookups', used: 4 }),
			})
		).toEqual({
			allowed: false,
			reason: 'messages',
		})
	})

	test('blocks live prompts when the monthly lookup cap is exhausted', () => {
		expect(
			assessChatUsageGate({
				messages: summarizeUsage({ included: 40, label: 'messages', used: 12 }),
				requiresSearch: true,
				searches: summarizeUsage({ included: 25, label: 'live lookups', used: 25 }),
			})
		).toEqual({
			allowed: false,
			reason: 'searches',
		})
	})

	test('recommends the next plan up from the current one', () => {
		expect(getRecommendedUpgrade([...plans], 'free')?.slug).toBe('pro')
		expect(getRecommendedUpgrade([...plans], 'pro')).toBeNull()
	})
})
