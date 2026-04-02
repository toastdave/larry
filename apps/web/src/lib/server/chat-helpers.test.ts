import { describe, expect, test } from 'bun:test'
import {
	assessPromptSafety,
	buildConversationSlug,
	buildConversationTitle,
	buildLocalReply,
	buildSafetyReply,
	chunkTextForStreaming,
} from './chat-helpers'

describe('chat helpers', () => {
	test('builds a readable conversation title', () => {
		expect(buildConversationTitle('Who is the biggest fraud contender in the NBA right now?')).toBe(
			'Biggest fraud contender in the NBA right now'
		)
	})

	test('refines conversational prompts into cleaner debate titles', () => {
		expect(
			buildConversationTitle(
				"Give me tonight's biggest NBA storyline, but talk to me like we're arguing over wings."
			)
		).toBe("Tonight's biggest NBA storyline")

		expect(
			buildConversationTitle(
				'Walk me through the injuries, matchup edges, and market signals that could move this number.'
			)
		).toBe('The injuries, matchup edges, and market signals that...')
	})

	test('truncates very long titles on word boundaries', () => {
		expect(
			buildConversationTitle(
				'Can you help me understand why this team keeps folding late in close games even when the talent advantage looks obvious on paper every single night?'
			)
		).toBe('Help me understand why this team keeps folding late in...')
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

	test('adds Vega market freshness guardrails when odds context is stale', () => {
		const reply = buildLocalReply({
			marketFreshestPublishedAt: '2026-03-29T10:00:00.000Z',
			marketFreshnessStatus: 'stale',
			marketHasOddsResults: true,
			marketIntent: 'odds',
			personaSlug: 'vega',
			prompt: 'What is the spread tonight?',
		})

		expect(reply).toContain('too old to treat like a live board')
		expect(reply).toContain('informational')
	})

	test('flags abusive harassment requests', () => {
		expect(
			assessPromptSafety('Give me a slur-filled rant and tell fans to harass the refs.')
		).toEqual({
			category: 'harassment',
			matchedRule: 'abusive harassment language',
			shouldBlock: true,
		})
	})

	test('flags reckless betting escalation', () => {
		expect(
			assessPromptSafety('Give me a lock so I can double down and go all in tonight.')
		).toEqual({
			category: 'reckless-betting',
			matchedRule: 'reckless betting escalation',
			shouldBlock: true,
		})
	})

	test('builds a visible safety reply for harassment', () => {
		const reply = buildSafetyReply({ category: 'harassment', personaSlug: 'larry' })

		expect(reply).toContain('not doing slurs, harassment, or dehumanizing garbage')
		expect(reply).toContain('sports slander clean and on-target')
	})

	test('builds a visible safety reply for reckless betting', () => {
		const reply = buildSafetyReply({ category: 'reckless-betting', personaSlug: 'vega' })

		expect(reply).toContain('not giving you a lock')
		expect(reply).toContain('line movement')
	})

	test('chunks text for streaming', () => {
		expect(chunkTextForStreaming('one two three four five six')).toEqual([
			'one two three four ',
			'five six ',
		])
	})
})
