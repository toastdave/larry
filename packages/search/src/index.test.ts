import { describe, expect, test } from 'bun:test'
import {
	buildSearchPromptContext,
	formatCitationLabel,
	inferCitationKind,
	inferLeague,
	mergeSearchResponses,
	rankSearchResults,
	requiresFreshSearch,
	searchSportsWeb,
	searchStructuredSportsData,
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
		expect(buildSearchPromptContext(response)).toContain(
			'cite it inline with bracketed result numbers'
		)
	})

	test('returns a warning when no search key exists', async () => {
		const response = await searchSportsWeb({ query: 'live nfl playoff picture' })

		expect(response.results).toEqual([])
		expect(response.warning).toContain('SEARCH_API_KEY')
	})

	test('normalizes structured scoreboard results from ESPN', async () => {
		const response = await searchStructuredSportsData({
			fetch: (async () =>
				new Response(
					JSON.stringify({
						events: [
							{
								competitions: [
									{
										competitors: [
											{
												homeAway: 'away',
												score: '109',
												team: { abbreviation: 'BOS', displayName: 'Boston Celtics' },
											},
											{
												homeAway: 'home',
												score: '101',
												team: { abbreviation: 'NYK', displayName: 'New York Knicks' },
											},
										],
										date: '2026-03-29T22:00:00.000Z',
										name: 'Boston Celtics at New York Knicks',
										status: { type: { detail: 'Final' } },
										venue: { fullName: 'Madison Square Garden' },
									},
								],
								id: 'game-1',
							},
						],
					}),
					{ status: 200 }
				)) as unknown as typeof fetch,
			provider: 'espn',
			query: 'latest nba score tonight',
		})

		expect(response.results[0]?.resultType).toBe('scoreboard')
		expect(response.results[0]?.sourceName).toBe('ESPN scoreboard')
		expect(response.results[0]?.snippet).toContain('BOS 109 at NYK 101')
	})

	test('merges structured and narrative responses into one prompt context', () => {
		const merged = mergeSearchResponses(
			{
				freshness: 'live',
				league: 'NBA',
				provider: 'espn',
				query: 'latest nba score tonight',
				results: [
					{
						id: 'structured-1',
						resultType: 'scoreboard',
						snippet: 'BOS 109 at NYK 101. Final.',
						sourceName: 'ESPN scoreboard',
						title: 'Boston Celtics at New York Knicks',
						url: 'https://www.espn.com/nba/scoreboard',
					},
				],
			},
			{
				freshness: 'live',
				league: 'NBA',
				provider: 'tavily',
				query: 'latest nba score tonight',
				results: [
					{
						id: 'web-1',
						resultType: 'article',
						snippet: 'Boston closed the game with a 14-2 run.',
						sourceName: 'espn.com',
						title: 'Celtics finish strong against Knicks',
						url: 'https://www.espn.com/nba/story/_/id/1/celtics-finish-strong',
					},
				],
			}
		)

		expect(merged.results).toHaveLength(2)
		expect(merged.results[0]?.resultType).toBe('scoreboard')
		expect(buildSearchPromptContext(merged)).toContain('Live sports context is available')
	})

	test('ranks live scoreboard results ahead of narrative articles for score queries', () => {
		const ranked = rankSearchResults('latest nba score tonight', [
			{
				id: 'web-1',
				metadata: { score: 0.82 },
				publishedAt: '2026-03-29T23:00:00.000Z',
				resultType: 'article',
				snippet: 'A gamer recap from the arena.',
				sourceName: 'espn.com',
				title: 'Celtics finish strong against Knicks',
				url: 'https://www.espn.com/nba/story/_/id/1/celtics-finish-strong',
			},
			{
				id: 'structured-1',
				publishedAt: '2026-03-29T22:00:00.000Z',
				resultType: 'scoreboard',
				snippet: 'BOS 109 at NYK 101. Final.',
				sourceName: 'ESPN scoreboard',
				title: 'Boston Celtics at New York Knicks',
				url: 'https://www.espn.com/nba/scoreboard',
			},
		])

		expect(ranked[0]?.resultType).toBe('scoreboard')
	})
})
