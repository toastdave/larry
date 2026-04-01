export const supportedLeagues = ['NFL', 'NBA', 'MLB', 'NCAAF', 'NCAAB'] as const

export type SupportedLeague = (typeof supportedLeagues)[number]

export type SearchResultType = 'article' | 'scoreboard' | 'standing' | 'injury' | 'odds'

export type CitationKind = 'article' | 'score' | 'odds' | 'injury' | 'standings'

export type NormalizedSearchResult = {
	id: string
	metadata?: Record<string, unknown>
	publishedAt?: string | null
	resultType: SearchResultType
	snippet: string
	sourceName: string
	title: string
	url: string
}

export type SearchResponse = {
	freshness: 'general' | 'live'
	league: SupportedLeague | null
	provider: string
	query: string
	results: NormalizedSearchResult[]
	warning?: string
}

type SearchIntent = 'general' | 'injury' | 'odds' | 'scoreboard' | 'standings'

type EspnCompetition = {
	competitors?: Array<{
		homeAway?: 'away' | 'home'
		records?: Array<{ summary?: string; type?: string }>
		score?: string
		team?: { abbreviation?: string; displayName?: string }
		winner?: boolean
	}>
	date?: string
	name?: string
	status?: { type?: { detail?: string; shortDetail?: string } }
	venue?: { fullName?: string }
}

type EspnEvent = {
	competitions?: EspnCompetition[]
	id?: string
	name?: string
	season?: { slug?: string; type?: number }
	shortName?: string
	status?: { type?: { detail?: string; shortDetail?: string } }
}

type EspnStandingEntry = {
	stats?: Array<{
		description?: string
		displayValue?: string
		name?: string
		shortDisplayName?: string
	}>
	team?: { abbreviation?: string; displayName?: string }
}

type SportsDataRequest = {
	fetch?: typeof fetch
	provider?: string
	query: string
}

type TavilyResult = {
	content?: string
	published_date?: string
	raw_content?: string
	score?: number
	title?: string
	url?: string
}

type SearchRequest = {
	apiKey?: string
	fetch?: typeof fetch
	maxResults?: number
	provider?: string
	query: string
}

const freshSearchKeywords = [
	'today',
	'tonight',
	'now',
	'latest',
	'live',
	'score',
	'spread',
	'odds',
	'injury',
	'trade',
	'standings',
	'starting lineup',
]

function inferResultType(input: { query: string; title: string; url: string }) {
	const text = `${input.query} ${input.title} ${input.url}`.toLowerCase()

	if (text.includes('odds') || text.includes('spread') || text.includes('bet')) {
		return 'odds' satisfies SearchResultType
	}

	if (text.includes('injury') || text.includes('questionable') || text.includes('out')) {
		return 'injury' satisfies SearchResultType
	}

	if (text.includes('standing') || text.includes('playoff picture') || text.includes('table')) {
		return 'standing' satisfies SearchResultType
	}

	if (text.includes('score') || text.includes('schedule') || text.includes('box score')) {
		return 'scoreboard' satisfies SearchResultType
	}

	return 'article' satisfies SearchResultType
}

function normalizeSnippet(content: string | undefined) {
	if (!content) {
		return ''
	}

	return content.replace(/\s+/g, ' ').trim().slice(0, 280)
}

function sourceNameFromUrl(url: string) {
	try {
		return new URL(url).hostname.replace(/^www\./, '')
	} catch {
		return 'Unknown source'
	}
}

function leagueToEspnPath(league: SupportedLeague) {
	switch (league) {
		case 'MLB':
			return 'baseball/mlb'
		case 'NBA':
			return 'basketball/nba'
		case 'NCAAB':
			return 'basketball/mens-college-basketball'
		case 'NCAAF':
			return 'football/college-football'
		case 'NFL':
			return 'football/nfl'
	}
}

function prefersStandings(query: string) {
	const value = query.toLowerCase()
	return value.includes('standing') || value.includes('playoff picture') || value.includes('table')
}

function inferSearchIntent(query: string): SearchIntent {
	const value = query.toLowerCase()

	if (
		value.includes('odds') ||
		value.includes('spread') ||
		value.includes('moneyline') ||
		value.includes('line movement') ||
		value.includes('total')
	) {
		return 'odds'
	}

	if (
		value.includes('injury') ||
		value.includes('questionable') ||
		value.includes('lineup') ||
		value.includes('starting lineup') ||
		value.includes('who is out')
	) {
		return 'injury'
	}

	if (prefersStandings(query)) {
		return 'standings'
	}

	if (
		value.includes('score') ||
		value.includes('schedule') ||
		value.includes('today') ||
		value.includes('tonight') ||
		value.includes('live') ||
		value.includes('final')
	) {
		return 'scoreboard'
	}

	return 'general'
}

function resultPriorityForIntent(intent: SearchIntent, resultType: SearchResultType) {
	const priorities = {
		general: {
			article: 52,
			injury: 56,
			odds: 54,
			scoreboard: 60,
			standing: 58,
		},
		injury: {
			article: 58,
			injury: 92,
			odds: 44,
			scoreboard: 48,
			standing: 32,
		},
		odds: {
			article: 62,
			injury: 76,
			odds: 94,
			scoreboard: 46,
			standing: 28,
		},
		scoreboard: {
			article: 42,
			injury: 38,
			odds: 34,
			scoreboard: 96,
			standing: 56,
		},
		standings: {
			article: 40,
			injury: 34,
			odds: 26,
			scoreboard: 54,
			standing: 96,
		},
	} satisfies Record<SearchIntent, Record<SearchResultType, number>>

	return priorities[intent][resultType]
}

function getRecencyBonus(publishedAt: string | null | undefined) {
	if (!publishedAt) {
		return 0
	}

	const ageInHours = Math.max(0, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000)

	if (ageInHours <= 6) {
		return 12
	}

	if (ageInHours <= 24) {
		return 8
	}

	if (ageInHours <= 72) {
		return 4
	}

	return 1
}

function getStructuredSourceBonus(result: NormalizedSearchResult) {
	if (result.sourceName.startsWith('ESPN ')) {
		return 6
	}

	return 0
}

function getProviderRankingBonus(result: NormalizedSearchResult) {
	const providerScore = result.metadata?.score

	if (typeof providerScore === 'number' && Number.isFinite(providerScore)) {
		return Math.round(providerScore * 10)
	}

	return 0
}

function getDedupedResults(results: NormalizedSearchResult[]) {
	const seen = new Set<string>()

	return results.filter((result) => {
		const key = `${result.sourceName}::${result.title}::${result.url}`.toLowerCase()

		if (seen.has(key)) {
			return false
		}

		seen.add(key)
		return true
	})
}

export function rankSearchResults(query: string, results: NormalizedSearchResult[]) {
	const intent = inferSearchIntent(query)

	return getDedupedResults(results)
		.map((result, index) => ({
			result,
			score:
				resultPriorityForIntent(intent, result.resultType) +
				getRecencyBonus(result.publishedAt) +
				getStructuredSourceBonus(result) +
				getProviderRankingBonus(result) +
				Math.max(0, 5 - index),
		}))
		.sort((left, right) => right.score - left.score)
		.map(({ result }) => result)
}

function buildCompetitionSnippet(competition: EspnCompetition) {
	const homeTeam = competition.competitors?.find((team) => team.homeAway === 'home')
	const awayTeam = competition.competitors?.find((team) => team.homeAway === 'away')
	const status =
		competition.status?.type?.detail ??
		competition.status?.type?.shortDetail ??
		'Status unavailable'
	const scoreLine = `${awayTeam?.team?.abbreviation ?? 'AWAY'} ${awayTeam?.score ?? '-'} at ${homeTeam?.team?.abbreviation ?? 'HOME'} ${homeTeam?.score ?? '-'}`

	return `${scoreLine}. ${status}. Venue: ${competition.venue?.fullName ?? 'TBD'}.`
}

function buildStandingsSnippet(entry: EspnStandingEntry) {
	const wins = entry.stats?.find((stat) => stat.name === 'wins' || stat.shortDisplayName === 'W')
	const losses = entry.stats?.find(
		(stat) => stat.name === 'losses' || stat.shortDisplayName === 'L'
	)
	const gamesBack = entry.stats?.find(
		(stat) => stat.name === 'gamesBehind' || stat.shortDisplayName === 'GB'
	)
	const streak = entry.stats?.find(
		(stat) => stat.name === 'streak' || stat.shortDisplayName === 'STRK'
	)

	return [
		`Record: ${wins?.displayValue ?? '?'}-${losses?.displayValue ?? '?'}.`,
		gamesBack?.displayValue ? `Games back: ${gamesBack.displayValue}.` : null,
		streak?.displayValue ? `Streak: ${streak.displayValue}.` : null,
	]
		.filter(Boolean)
		.join(' ')
}

function normalizeEspnScoreboardResults(league: SupportedLeague, events: EspnEvent[]) {
	return events.flatMap((event) => {
		const competition = event.competitions?.[0]

		if (!competition) {
			return []
		}

		const title = competition.name ?? event.name ?? event.shortName

		if (!title) {
			return []
		}

		return [
			{
				id: event.id ?? title,
				metadata: {
					league,
					season: event.season?.slug ?? null,
				},
				publishedAt: competition.date ?? null,
				resultType: 'scoreboard' satisfies SearchResultType,
				snippet: buildCompetitionSnippet(competition),
				sourceName: 'ESPN scoreboard',
				title,
				url: `https://www.espn.com/${league.toLowerCase()}/scoreboard`,
			} satisfies NormalizedSearchResult,
		]
	})
}

function normalizeEspnStandingsResults(league: SupportedLeague, entries: EspnStandingEntry[]) {
	return entries
		.filter((entry): entry is EspnStandingEntry & { team: { displayName: string } } =>
			Boolean(entry.team?.displayName)
		)
		.slice(0, 8)
		.map((entry, index) => {
			return {
				id: `${league}-standing-${index + 1}`,
				metadata: {
					league,
				},
				publishedAt: null,
				resultType: 'standing' satisfies SearchResultType,
				snippet: buildStandingsSnippet(entry),
				sourceName: 'ESPN standings',
				title: `${entry.team.displayName} standings snapshot`,
				url: `https://www.espn.com/${league.toLowerCase()}/standings`,
			} satisfies NormalizedSearchResult
		})
}

function normalizeTavilyResults(query: string, results: TavilyResult[]) {
	return results
		.filter((result): result is TavilyResult & { title: string; url: string } =>
			Boolean(result.title && result.url)
		)
		.map((result, index) => {
			const resultType = inferResultType({ query, title: result.title, url: result.url })

			return {
				id: `${index + 1}`,
				metadata: {
					score: result.score ?? null,
				},
				publishedAt: result.published_date ?? null,
				resultType,
				snippet: normalizeSnippet(result.content ?? result.raw_content),
				sourceName: sourceNameFromUrl(result.url),
				title: result.title,
				url: result.url,
			} satisfies NormalizedSearchResult
		})
}

export function requiresFreshSearch(input: string) {
	const query = input.toLowerCase()

	return freshSearchKeywords.some((keyword) => query.includes(keyword))
}

export function inferLeague(input: string): SupportedLeague | null {
	const query = input.toLowerCase()

	if (query.includes('nfl') || query.includes('super bowl')) {
		return 'NFL'
	}

	if (query.includes('nba') || query.includes('playoffs') || query.includes('finals')) {
		return 'NBA'
	}

	if (query.includes('mlb') || query.includes('world series')) {
		return 'MLB'
	}

	if (query.includes('college football') || query.includes('cfb')) {
		return 'NCAAF'
	}

	if (query.includes('college basketball') || query.includes('march madness')) {
		return 'NCAAB'
	}

	return null
}

export function formatCitationLabel(
	result: Pick<NormalizedSearchResult, 'sourceName' | 'publishedAt'>
) {
	return result.publishedAt
		? `${result.sourceName} - ${new Date(result.publishedAt).toLocaleDateString('en-US')}`
		: result.sourceName
}

export function inferCitationKind(resultType: SearchResultType): CitationKind {
	switch (resultType) {
		case 'injury':
			return 'injury'
		case 'odds':
			return 'odds'
		case 'scoreboard':
			return 'score'
		case 'standing':
			return 'standings'
		default:
			return 'article'
	}
}

export function buildSearchPromptContext(response: SearchResponse, maxResults = 4) {
	if (response.results.length === 0) {
		return null
	}

	const resultLines = response.results.slice(0, maxResults).map((result, index) => {
		const publishedDate = result.publishedAt
			? `Published: ${new Date(result.publishedAt).toLocaleDateString('en-US')}. `
			: ''

		return `${index + 1}. ${result.title} (${result.sourceName}). ${publishedDate}Snippet: ${result.snippet}. URL: ${result.url}`
	})

	return [
		'Live sports context is available for this answer.',
		'Use the retrieved context below as the factual source of truth for time-sensitive claims.',
		'Mention source names naturally when using a retrieved fact and do not invent live details beyond what is supported here.',
		'When you use a retrieved fact, cite it inline with bracketed result numbers like [1] or [2][3], matching the numbered list below.',
		...resultLines,
	].join(' ')
}

export function mergeSearchResponses(...responses: SearchResponse[]): SearchResponse {
	const firstResponse = responses[0]

	if (!firstResponse) {
		return {
			freshness: 'general',
			league: null,
			provider: 'combined',
			query: '',
			results: [],
		}
	}

	return {
		freshness: responses.some((response) => response.freshness === 'live') ? 'live' : 'general',
		league: firstResponse.league,
		provider: responses.map((response) => response.provider).join('+'),
		query: firstResponse.query,
		results: rankSearchResults(
			firstResponse.query,
			responses.flatMap((response) => response.results)
		),
		warning: responses
			.map((response) => response.warning)
			.filter((warning): warning is string => Boolean(warning))
			.join(' | '),
	}
}

export async function searchSportsWeb({
	apiKey,
	fetch: fetchImpl = fetch,
	maxResults = 5,
	provider = 'tavily',
	query,
}: SearchRequest): Promise<SearchResponse> {
	const league = inferLeague(query)
	const freshness = requiresFreshSearch(query) ? 'live' : 'general'

	if (!apiKey) {
		return {
			freshness,
			league,
			provider,
			query,
			results: [],
			warning: 'SEARCH_API_KEY is not configured.',
		}
	}

	if (provider !== 'tavily') {
		return {
			freshness,
			league,
			provider,
			query,
			results: [],
			warning: `Unsupported search provider: ${provider}.`,
		}
	}

	const response = await fetchImpl('https://api.tavily.com/search', {
		body: JSON.stringify({
			api_key: apiKey,
			include_answer: false,
			include_images: false,
			max_results: maxResults,
			query,
			search_depth: 'advanced',
			topic: 'news',
		}),
		headers: {
			'content-type': 'application/json',
		},
		method: 'POST',
	})

	if (!response.ok) {
		throw new Error(`Search provider request failed with ${response.status}.`)
	}

	const payload = (await response.json()) as { results?: TavilyResult[] }

	return {
		freshness,
		league,
		provider,
		query,
		results: normalizeTavilyResults(query, payload.results ?? []),
	}
}

export async function searchStructuredSportsData({
	fetch: fetchImpl = fetch,
	provider = 'espn',
	query,
}: SportsDataRequest): Promise<SearchResponse> {
	const league = inferLeague(query)
	const freshness = requiresFreshSearch(query) ? 'live' : 'general'

	if (!league) {
		return {
			freshness,
			league: null,
			provider,
			query,
			results: [],
			warning: 'No supported league found for structured sports data.',
		}
	}

	if (provider !== 'espn') {
		return {
			freshness,
			league,
			provider,
			query,
			results: [],
			warning: `Unsupported sports data provider: ${provider}.`,
		}
	}

	const sportPath = leagueToEspnPath(league)
	const endpoint = prefersStandings(query)
		? `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/standings`
		: `https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`

	const response = await fetchImpl(endpoint)

	if (!response.ok) {
		throw new Error(`Structured sports data request failed with ${response.status}.`)
	}

	if (prefersStandings(query)) {
		const payload = (await response.json()) as {
			children?: Array<{ standings?: { entries?: EspnStandingEntry[] } }>
		}

		const entries = payload.children?.flatMap((child) => child.standings?.entries ?? []) ?? []

		return {
			freshness,
			league,
			provider,
			query,
			results: normalizeEspnStandingsResults(league, entries),
		}
	}

	const payload = (await response.json()) as { events?: EspnEvent[] }

	return {
		freshness,
		league,
		provider,
		query,
		results: normalizeEspnScoreboardResults(league, payload.events ?? []),
	}
}
