import { describe, expect, test } from 'bun:test'
import {
	formatPlanPrice,
	getRecommendedUpgrade,
	humanizeFeatureFlag,
	summarizeUsage,
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

	test('recommends the next plan up from the current one', () => {
		expect(getRecommendedUpgrade([...plans], 'free')?.slug).toBe('pro')
		expect(getRecommendedUpgrade([...plans], 'pro')).toBeNull()
	})
})
