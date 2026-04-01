import { createSystemPrompt, sportsPersonas } from '@larry/ai'
import { createDb } from './client'
import { personaProfile, plan } from './schema/index'

const db = createDb()

await db
	.insert(plan)
	.values([
		{
			id: 'free',
			slug: 'free',
			name: 'Free',
			monthlyPriceCents: 0,
			annualPriceCents: 0,
			monthlyIncludedMessages: 40,
			monthlyIncludedSearches: 25,
			featureFlags: {
				citations: true,
				guestMode: true,
				prioritySearch: false,
			},
		},
		{
			id: 'pro',
			slug: 'pro',
			name: 'Pro',
			monthlyPriceCents: 1900,
			annualPriceCents: 19000,
			monthlyIncludedMessages: 400,
			monthlyIncludedSearches: 250,
			featureFlags: {
				citations: true,
				guestMode: false,
				prioritySearch: true,
				fasterModels: true,
			},
		},
		{
			id: 'pulse',
			slug: 'pulse',
			name: 'Pulse',
			monthlyPriceCents: 4900,
			annualPriceCents: 49000,
			monthlyIncludedMessages: 1500,
			monthlyIncludedSearches: 1200,
			featureFlags: {
				citations: true,
				prioritySearch: true,
				fasterModels: true,
				premiumLiveData: true,
				longerHistory: true,
			},
		},
	])
	.onConflictDoNothing()

await db
	.insert(personaProfile)
	.values(
		sportsPersonas.map((persona) => ({
			id: persona.id,
			isDefault: persona.slug === 'larry',
			name: persona.name,
			slug: persona.slug,
			systemPrompt: createSystemPrompt({ persona: persona.slug }),
			temperatureTenth: persona.slug === 'vega' ? 6 : persona.slug === 'scout' ? 7 : 8,
		}))
	)
	.onConflictDoNothing()

console.log('Seeded plans and persona profiles')
