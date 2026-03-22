import { describe, expect, test } from 'bun:test'
import { createSystemPrompt, defaultConversationStarters, defaultPersona } from './index'

describe('ai package', () => {
	test('exposes the default persona', () => {
		expect(defaultPersona.name).toBe('Larry')
		expect(defaultConversationStarters.length).toBeGreaterThan(0)
	})

	test('builds a system prompt with team context', () => {
		const prompt = createSystemPrompt({ favoriteTeam: 'Knicks', billingTier: 'pro' })

		expect(prompt).toContain('Knicks')
		expect(prompt).toContain('pro')
	})
})
