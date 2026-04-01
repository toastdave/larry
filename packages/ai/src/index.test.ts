import { describe, expect, test } from 'bun:test'
import {
	createSystemPrompt,
	defaultConversationStarters,
	defaultPersona,
	getConversationStarters,
	getPersonaBySlug,
	getPersonaEvalCases,
	sportsPersonas,
} from './index'

describe('ai package', () => {
	test('exposes the default persona', () => {
		expect(defaultPersona.name).toBe('Larry')
		expect(defaultConversationStarters.length).toBeGreaterThan(0)
		expect(sportsPersonas).toHaveLength(3)
	})

	test('builds a system prompt with team context', () => {
		const prompt = createSystemPrompt({
			billingTier: 'pro',
			favoriteTeam: 'Knicks',
			rivalTeam: 'Celtics',
		})

		expect(prompt).toContain('Knicks')
		expect(prompt).toContain('Celtics')
		expect(prompt).toContain('pro')
	})

	test('resolves alternate personas with their own starters', () => {
		expect(getPersonaBySlug('scout').name).toBe('Scout')
		expect(getConversationStarters('vega')[0]).toContain('spread')

		const prompt = createSystemPrompt({ persona: 'vega' })

		expect(prompt).toContain('Vega')
		expect(prompt).toContain('never present a wager as guaranteed')
		expect(prompt).toContain('stale, unverified, or unavailable')
		expect(prompt).toContain('Do not use slurs')
		expect(prompt).toContain('chasing losses')
	})

	test('exposes persona eval cases for style and safety coverage', () => {
		const larryCases = getPersonaEvalCases('larry')
		const vegaCases = getPersonaEvalCases('vega')

		expect(larryCases).toHaveLength(2)
		expect(larryCases[0]?.expectations.join(' ')).toContain('playful')
		expect(vegaCases).toHaveLength(2)
		expect(vegaCases[1]?.prompt).toContain('double down')
		expect(vegaCases[1]?.expectations.join(' ')).toContain('Refuses reckless gambling framing')
	})
})
