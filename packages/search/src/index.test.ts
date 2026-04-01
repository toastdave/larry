import { describe, expect, test } from 'bun:test'
import {
	assessSearchGuardrails,
	buildSearchPromptContext,
	formatCitationLabel,
	inferCitationKind,
	inferLeague,
	inferSearchIntent,
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
		expect(inferSearchIntent('What is the spread tonight?')).toBe('odds')
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

	test('normalizes structured injuries results from ESPN', async () => {
		const response = await searchStructuredSportsData({
			fetch: (async () =>
				new Response(
					JSON.stringify({
						injuries: [
							{
								displayName: 'New York Knicks',
								id: '1',
								injuries: [
									{
										athlete: {
											displayName: 'Jalen Brunson',
											links: [
												{
													href: 'https://www.espn.com/nba/player/_/id/3934672/jalen-brunson',
													rel: ['playercard'],
												},
											],
										},
										date: '2026-03-31T21:03:00.000Z',
										id: 'injury-1',
										shortComment: 'Brunson is questionable for Wednesday.',
										status: 'Day-To-Day',
									},
								],
							},
						],
					}),
					{ status: 200 }
				)) as unknown as typeof fetch,
			provider: 'espn',
			query: 'latest nba injury report today',
		})

		expect(response.results[0]?.resultType).toBe('injury')
		expect(response.results[0]?.sourceName).toBe('ESPN injuries')
		expect(response.results[0]?.title).toContain('Jalen Brunson')
	})

	test('normalizes structured odds and injury results for odds queries', async () => {
		const mockFetch = (async (input: RequestInfo | URL) => {
			const url = String(input)

			if (url.includes('/scoreboard')) {
				return new Response(
					JSON.stringify({
						events: [
							{
								competitions: [
									{
										competitors: [
											{
												homeAway: 'away',
												score: '109',
												team: { abbreviation: 'NYK', displayName: 'New York Knicks' },
											},
											{
												homeAway: 'home',
												score: '111',
												team: { abbreviation: 'BOS', displayName: 'Boston Celtics' },
											},
										],
										date: '2026-03-31T23:00:00.000Z',
										id: '401810954',
										name: 'New York Knicks at Boston Celtics',
									},
								],
								id: '401810954',
							},
						],
					}),
					{ status: 200 }
				)
			}

			if (url.includes('/injuries')) {
				return new Response(
					JSON.stringify({
						injuries: [
							{
								displayName: 'Boston Celtics',
								id: '2',
								injuries: [
									{
										athlete: { displayName: 'Jayson Tatum' },
										date: '2026-03-31T18:00:00.000Z',
										id: 'injury-2',
										shortComment: 'Tatum is probable.',
										status: 'Probable',
									},
								],
							},
						],
					}),
					{ status: 200 }
				)
			}

			if (url.includes('/odds?lang=en&region=us')) {
				return new Response(
					JSON.stringify({
						items: [
							{
								awayTeamOdds: { moneyLine: 110 },
								details: 'BOS -2.5',
								homeTeamOdds: { moneyLine: -130 },
								overOdds: -110,
								overUnder: 225.5,
								provider: { name: 'DraftKings' },
								underOdds: -110,
							},
						],
					}),
					{ status: 200 }
				)
			}

			return new Response(null, { status: 404 })
		}) as unknown as typeof fetch

		const response = await searchStructuredSportsData({
			fetch: mockFetch,
			provider: 'espn',
			query: 'latest nba spread tonight for Knicks vs Celtics',
		})

		expect(response.results.some((result) => result.resultType === 'odds')).toBe(true)
		expect(response.results.some((result) => result.resultType === 'injury')).toBe(true)
		expect(response.results[0]?.title).toContain('Knicks')
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

	test('ranks structured evidence ahead of narrative coverage for Scout', () => {
		const ranked = rankSearchResults(
			'compare these playoff teams',
			[
				{
					id: 'article-1',
					metadata: { score: 0.91 },
					publishedAt: '2026-03-31T12:00:00.000Z',
					resultType: 'article',
					snippet: 'A narrative preview of the matchup.',
					sourceName: 'espn.com',
					title: 'Playoff preview',
					url: 'https://www.espn.com/nba/story/_/id/1/playoff-preview',
				},
				{
					id: 'standing-1',
					publishedAt: '2026-03-31T12:00:00.000Z',
					resultType: 'standing',
					snippet: 'Record: 54-28. Games back: 1.0.',
					sourceName: 'ESPN standings',
					title: 'Boston Celtics standings snapshot',
					url: 'https://www.espn.com/nba/standings',
				},
			],
			{ personaSlug: 'scout' }
		)

		expect(ranked[0]?.resultType).toBe('standing')
	})

	test('merges search responses using persona-aware ranking', () => {
		const merged = mergeSearchResponses(
			{
				freshness: 'live',
				league: 'NBA',
				provider: 'espn',
				query: 'compare these playoff teams',
				results: [
					{
						id: 'standing-1',
						resultType: 'standing',
						snippet: 'Record: 54-28.',
						sourceName: 'ESPN standings',
						title: 'Boston Celtics standings snapshot',
						url: 'https://www.espn.com/nba/standings',
					},
				],
			},
			{
				freshness: 'live',
				league: 'NBA',
				provider: 'tavily',
				query: 'compare these playoff teams',
				results: [
					{
						id: 'article-1',
						metadata: { score: 0.95 },
						resultType: 'article',
						snippet: 'A narrative preview.',
						sourceName: 'espn.com',
						title: 'Playoff preview',
						url: 'https://www.espn.com/nba/story/_/id/1/playoff-preview',
					},
				],
			},
			{ personaSlug: 'scout' }
		)

		expect(merged.results[0]?.resultType).toBe('standing')
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

	test('assesses Vega odds freshness guardrails', () => {
		const guardrails = assessSearchGuardrails(
			'What is the spread tonight?',
			[
				{
					id: '1',
					publishedAt: '2026-03-29T10:00:00.000Z',
					resultType: 'odds',
					snippet: 'The line opened at -4.5.',
					sourceName: 'odds.example',
					title: 'Latest spread update',
					url: 'https://odds.example/spread',
				},
			],
			{ now: new Date('2026-03-29T18:30:00.000Z') }
		)

		expect(guardrails.intent).toBe('odds')
		expect(guardrails.hasOddsResults).toBe(true)
		expect(guardrails.freshnessStatus).toBe('stale')
	})

	test('adds Vega market warnings to the prompt context when odds are missing', () => {
		const context = buildSearchPromptContext(
			{
				freshness: 'live',
				league: 'NBA',
				provider: 'tavily',
				query: 'What is the spread tonight?',
				results: [
					{
						id: '1',
						publishedAt: '2026-03-29T22:00:00.000Z',
						resultType: 'article',
						snippet: 'Preview coverage without a quoted line.',
						sourceName: 'espn.com',
						title: 'Game preview',
						url: 'https://www.espn.com/nba/story/_/id/1/game-preview',
					},
				],
			},
			{ personaSlug: 'vega' }
		)

		expect(context).toContain('Vega warning: no dedicated odds result was retrieved')
	})

	test('includes provider retrieval timing and movement notes for fresh Vega odds results', () => {
		const retrievedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString()

		const context = buildSearchPromptContext(
			{
				freshness: 'live',
				league: 'NBA',
				provider: 'espn',
				query: 'What is the spread tonight?',
				results: [
					{
						id: 'odds-1',
						metadata: {
							lineMovementSummary: 'Spread moved from -1.5 to -2.5',
							retrievedAt,
						},
						publishedAt: retrievedAt,
						resultType: 'odds',
						snippet: 'ORL -2.5. Total 225.5.',
						sourceName: 'Draft Kings odds',
						title: 'Orlando Magic at Atlanta Hawks odds snapshot',
						url: 'https://www.espn.com/basketball/nba/scoreboard',
					},
				],
			},
			{ personaSlug: 'vega' }
		)

		expect(context).toContain('retrieved from the provider at')
		expect(context).toContain('Spread moved from -1.5 to -2.5')
	})

	test('stores movement metadata in structured odds results', async () => {
		const mockFetch = (async (input: RequestInfo | URL) => {
			const url = String(input)

			if (url.includes('/scoreboard')) {
				return new Response(
					JSON.stringify({
						events: [
							{
								competitions: [
									{
										competitors: [
											{
												homeAway: 'away',
												team: { abbreviation: 'NYK', displayName: 'New York Knicks' },
											},
											{
												homeAway: 'home',
												team: { abbreviation: 'BOS', displayName: 'Boston Celtics' },
											},
										],
										id: '401810954',
										name: 'New York Knicks at Boston Celtics',
									},
								],
								id: '401810954',
							},
						],
					}),
					{ status: 200 }
				)
			}

			if (url.includes('/injuries')) {
				return new Response(JSON.stringify({ injuries: [] }), { status: 200 })
			}

			if (url.includes('/odds?lang=en&region=us')) {
				return new Response(
					JSON.stringify({
						items: [
							{
								awayTeamOdds: {
									moneyLine: 110,
									open: { moneyLine: { american: '+120' } },
									current: { moneyLine: { american: '+110' } },
								},
								details: 'BOS -2.5',
								homeTeamOdds: {
									moneyLine: -130,
									open: { moneyLine: { american: '-140' } },
									current: { moneyLine: { american: '-130' } },
								},
								open: { pointSpread: { american: '-1.5' } },
								current: { pointSpread: { american: '-2.5' } },
								overOdds: -110,
								overUnder: 225.5,
								provider: { name: 'DraftKings' },
								underOdds: -110,
							},
						],
					}),
					{ status: 200 }
				)
			}

			return new Response(null, { status: 404 })
		}) as unknown as typeof fetch

		const response = await searchStructuredSportsData({
			fetch: mockFetch,
			provider: 'espn',
			query: 'latest nba spread tonight for Knicks vs Celtics',
		})

		const oddsResult = response.results.find((result) => result.resultType === 'odds')

		expect(oddsResult?.snippet).toContain('Spread moved from -1.5 to -2.5')
		expect(oddsResult?.metadata?.lineMovementSummary).toBe(
			'Spread moved from -1.5 to -2.5. Away moneyline moved from +120 to +110. Home moneyline moved from -140 to -130'
		)
		expect(oddsResult?.metadata?.retrievedAt).toBeDefined()
	})
})
