import { describe, expect, test } from 'bun:test'
import {
	buildConversationSlug,
	buildConversationTitle,
	buildLocalReply,
	chunkTextForStreaming,
} from './chat-helpers'

describe('chat helpers', () => {
	test('builds a readable conversation title', () => {
		expect(buildConversationTitle('Who is the biggest fraud contender in the NBA right now?')).toBe(
			'Who is the biggest fraud contender in the NBA right now?'
		)
	})

	test('builds a stable slug prefix with a random suffix', () => {
		const slug = buildConversationSlug('The Bills are going to break hearts again')

		expect(slug.startsWith('the-bills-are-going-to-break-hearts-again-')).toBe(true)
		expect(slug.length).toBeGreaterThan(10)
	})

	test('mentions missing live data when fresh search is required', () => {
		const reply = buildLocalReply({ prompt: 'What are the latest NBA standings today?' })

		expect(reply).toContain('not going to fake fresh facts')
	})

	test('weaves rival team context into fallback copy', () => {
		const reply = buildLocalReply({
			favoriteTeam: 'Knicks',
			prompt: 'Who is the biggest fraud contender in the NBA right now?',
			rivalTeam: 'Celtics',
		})

		expect(reply).toContain('Knicks')
		expect(reply).toContain('Celtics')
	})

	test('chunks text for streaming', () => {
		expect(chunkTextForStreaming('one two three four five six')).toEqual([
			'one two three four ',
			'five six ',
		])
	})
})
