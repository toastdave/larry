import { describe, expect, test } from 'bun:test'
import { filterConversations, summarizeConversationFilters } from './conversation-history'

const conversations = [
	{ personaSlug: 'larry', title: 'Knicks fraud watch' },
	{ personaSlug: 'scout', title: 'Celtics playoff comparison' },
	{ personaSlug: 'vega', title: 'Tonight spread movement board' },
]

describe('conversation history helpers', () => {
	test('filters conversations by title search', () => {
		expect(filterConversations(conversations, { search: 'playoff' })).toEqual([conversations[1]])
	})

	test('filters conversations by persona and search together', () => {
		expect(filterConversations(conversations, { personaSlug: 'vega', search: 'spread' })).toEqual([
			conversations[2],
		])
	})

	test('summarizes active history filters', () => {
		expect(
			summarizeConversationFilters({
				personaName: 'Scout',
				resultCount: 2,
				search: 'playoff',
			})
		).toBe('2 debates for Scout matching "playoff"')
	})
})
