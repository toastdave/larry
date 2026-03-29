import { describe, expect, test } from 'bun:test'
import {
	buildSearchPromptContext,
	formatCitationLabel,
	inferCitationKind,
	inferLeague,
	requiresFreshSearch,
	searchSportsWeb,
} from './index'

describe('search package', () => {
	test('detects fresh search intent', () => {
		expect(requiresFreshSearch('What are the latest NBA standings today?')).toBe(true)
		expect(requiresFreshSearch('Tell me why the triangle offense is dead')).toBe(false)
	})

	test('infers leagues and formats citations', () => {
		expect(inferLeague('Give me the latest on the NFL playoff picture')).toBe('NFL')
		expect(
			formatCitationLabel({
				publishedAt: '2026-03-22T10:00:00.000Z',
				sourceName: 'ESPN',
			})
		).toContain('ESPN')
		expect(inferCitationKind('scoreboard')).toBe('score')
	})

	test('normalizes tavily results and builds prompt context', async () => {
		const mockFetch = (async () =>
			new Response(
				JSON.stringify({
					results: [
						{
							content: 'Boston clinched a playoff berth after the win.',
							published_date: '2026-03-29T10:00:00.000Z',
							title: 'Celtics lock up another playoff berth',
							url: 'https://www.espn.com/nba/story/_/id/1/celtics-playoff-berth',
						},
					],
				}),
				{ status: 200 }
			)) as unknown as typeof fetch

		const response = await searchSportsWeb({
			apiKey: 'demo',
			fetch: mockFetch,
			query: 'latest NBA standings today',
		})

		expect(response.results).toHaveLength(1)
		expect(response.results[0]?.sourceName).toBe('espn.com')
		expect(buildSearchPromptContext(response)).toContain('Live sports context is available')
	})

	test('returns a warning when no search key exists', async () => {
		const response = await searchSportsWeb({ query: 'live nfl playoff picture' })

		expect(response.results).toEqual([])
		expect(response.warning).toContain('SEARCH_API_KEY')
	})
})
