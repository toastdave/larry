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

export type SearchIntent = 'general' | 'injury' | 'odds' | 'scoreboard' | 'standings'

export type SearchFreshnessStatus = 'fresh' | 'stale' | 'unknown'

export type SearchGuardrailAssessment = {
	freshestPublishedAt: string | null
	freshnessStatus: SearchFreshnessStatus
	hasInjuryResults: boolean
	hasOddsResults: boolean
	hasStructuredResults: boolean
	intent: SearchIntent
	stalenessWindowHours: number
}

type SearchRankingOptions = {
	personaSlug?: string | null
}

type EspnCompetition = {
	competitors?: Array<{
		homeAway?: 'away' | 'home'
		records?: Array<{ summary?: string; type?: string }>
		score?: string
		team?: { abbreviation?: string; displayName?: string }
		winner?: boolean
	}>
	date?: string
	id?: string
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

type EspnTeamInjuryEntry = {
	displayName?: string
	id?: string
	injuries?: Array<{
		athlete?: {
			displayName?: string
			links?: Array<{ href?: string; rel?: string[] }>
			shortName?: string
		}
		date?: string
		id?: string
		longComment?: string
		shortComment?: string
		status?: string
	}>
}

type EspnOddsItem = {
	awayTeamOdds?: {
		close?: {
			moneyLine?: { american?: string }
			pointSpread?: { american?: string }
		}
		current?: {
			moneyLine?: { american?: string }
			pointSpread?: { american?: string }
		}
		moneyLine?: number
		open?: {
			moneyLine?: { american?: string }
			pointSpread?: { american?: string }
		}
	}
	boardUpdatedAt?: string
	close?: {
		pointSpread?: { american?: string }
	}
	date?: string
	details?: string
	displayDate?: string
	homeTeamOdds?: {
		close?: {
			moneyLine?: { american?: string }
			pointSpread?: { american?: string }
		}
		current?: {
			moneyLine?: { american?: string }
			pointSpread?: { american?: string }
		}
		moneyLine?: number
		open?: {
			moneyLine?: { american?: string }
			pointSpread?: { american?: string }
		}
	}
	current?: {
		pointSpread?: { american?: string }
	}
	lastUpdated?: string
	open?: {
		pointSpread?: { american?: string }
	}
	openingDate?: string
	overOdds?: number
	overUnder?: number
	provider?: { name?: string }
	spread?: number
	underOdds?: number
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

function leagueToEspnCoreLeague(league: SupportedLeague) {
	switch (league) {
		case 'MLB':
			return 'mlb'
		case 'NBA':
			return 'nba'
		case 'NCAAB':
			return 'mens-college-basketball'
		case 'NCAAF':
			return 'college-football'
		case 'NFL':
			return 'nfl'
	}
}

function buildEspnWebUrl(sportPath: string, suffix: string) {
	return `https://www.espn.com/${sportPath}/${suffix}`
}

function prefersStandings(query: string) {
	const value = query.toLowerCase()
	return value.includes('standing') || value.includes('playoff picture') || value.includes('table')
}

function prefersInjuries(query: string) {
	return inferSearchIntent(query) === 'injury'
}

function prefersOdds(query: string) {
	return inferSearchIntent(query) === 'odds'
}

const queryStopWords = new Set([
	'and',
	'are',
	'for',
	'from',
	'game',
	'give',
	'how',
	'injury',
	'injuries',
	'latest',
	'line',
	'live',
	'moneyline',
	'news',
	'odds',
	'over',
	'score',
	'scores',
	'spread',
	'standings',
	'team',
	'the',
	'today',
	'tonight',
	'total',
	'what',
	'who',
	'with',
])

function normalizeQueryTerms(query: string) {
	return query
		.toLowerCase()
		.split(/[^a-z0-9]+/)
		.filter((term) => term.length >= 3 && !queryStopWords.has(term))
}

function getStalenessWindowHours(intent: SearchIntent) {
	switch (intent) {
		case 'odds':
			return 6
		case 'injury':
			return 12
		case 'scoreboard':
			return 24
		case 'standings':
			return 72
		default:
			return 72
	}
}

export function inferSearchIntent(query: string): SearchIntent {
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

function getFreshestTimestamp(results: NormalizedSearchResult[]) {
	const publishedTimestamps = results
		.map((result) => result.publishedAt)
		.filter((value): value is string => Boolean(value))

	if (publishedTimestamps.length === 0) {
		return null
	}

	return publishedTimestamps.sort((left, right) => +new Date(right) - +new Date(left))[0] ?? null
}

export function assessSearchGuardrails(
	query: string,
	results: NormalizedSearchResult[],
	options?: { now?: Date }
): SearchGuardrailAssessment {
	const intent = inferSearchIntent(query)
	const stalenessWindowHours = getStalenessWindowHours(intent)
	const relevantResults =
		intent === 'odds'
			? results.filter((result) => result.resultType === 'odds' || result.resultType === 'injury')
			: results
	const freshestPublishedAt = getFreshestTimestamp(relevantResults)
	const hasOddsResults = results.some((result) => result.resultType === 'odds')
	const hasInjuryResults = results.some((result) => result.resultType === 'injury')
	const hasStructuredResults = results.some((result) => result.resultType !== 'article')

	if (!freshestPublishedAt) {
		return {
			freshestPublishedAt: null,
			freshnessStatus: 'unknown',
			hasInjuryResults,
			hasOddsResults,
			hasStructuredResults,
			intent,
			stalenessWindowHours,
		}
	}

	const now = options?.now ?? new Date()
	const ageInHours = Math.max(
		0,
		(now.getTime() - new Date(freshestPublishedAt).getTime()) / 3_600_000
	)

	return {
		freshestPublishedAt,
		freshnessStatus: ageInHours <= stalenessWindowHours ? 'fresh' : 'stale',
		hasInjuryResults,
		hasOddsResults,
		hasStructuredResults,
		intent,
		stalenessWindowHours,
	}
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

function getQueryMatchBonus(query: string, result: NormalizedSearchResult) {
	const terms = normalizeQueryTerms(query)

	if (terms.length === 0) {
		return 0
	}

	const haystack = `${result.title} ${result.snippet} ${result.sourceName}`.toLowerCase()
	const matchCount = terms.filter((term) => haystack.includes(term)).length

	return Math.min(matchCount * 6, 24)
}

function getPersonaRankingBonus(
	personaSlug: string | null | undefined,
	result: NormalizedSearchResult
) {
	switch (personaSlug) {
		case 'larry':
			switch (result.resultType) {
				case 'article':
					return 8
				case 'scoreboard':
					return 6
				case 'standing':
					return 4
				case 'injury':
					return 3
				case 'odds':
					return 1
			}

			return 0
		case 'scout':
			switch (result.resultType) {
				case 'scoreboard':
					return 12
				case 'standing':
					return 12
				case 'injury':
					return 5
				case 'odds':
					return 1
				case 'article':
					return -6
			}

			return 0
		case 'vega':
			switch (result.resultType) {
				case 'odds':
					return 14
				case 'injury':
					return 9
				case 'scoreboard':
					return 4
				case 'standing':
					return 2
				case 'article':
					return -4
			}

			return 0
		default:
			return 0
	}
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

export function rankSearchResults(
	query: string,
	results: NormalizedSearchResult[],
	options?: SearchRankingOptions
) {
	const intent = inferSearchIntent(query)

	return getDedupedResults(results)
		.map((result, index) => ({
			result,
			score:
				resultPriorityForIntent(intent, result.resultType) +
				getPersonaRankingBonus(options?.personaSlug, result) +
				getQueryMatchBonus(query, result) +
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

function normalizeEspnInjuryResults(
	league: SupportedLeague,
	sportPath: string,
	teams: EspnTeamInjuryEntry[]
) {
	return teams
		.flatMap((team) =>
			(team.injuries ?? []).map((injury) => {
				const athleteName = injury.athlete?.displayName ?? injury.athlete?.shortName ?? 'Player'
				const playerCardUrl =
					injury.athlete?.links?.find((link) => link.rel?.includes('playercard'))?.href ??
					buildEspnWebUrl(sportPath, 'injuries')

				return {
					id: injury.id ?? `${team.id ?? team.displayName}-${athleteName}`,
					metadata: {
						athleteName,
						league,
						status: injury.status ?? null,
						teamName: team.displayName ?? null,
					},
					publishedAt: injury.date ?? null,
					resultType: 'injury' satisfies SearchResultType,
					snippet: normalizeSnippet(
						`${athleteName} (${team.displayName ?? 'Unknown team'}) - ${injury.status ?? 'Status unavailable'}. ${injury.shortComment ?? injury.longComment ?? 'No additional injury note available.'}`
					),
					sourceName: 'ESPN injuries',
					title: `${athleteName} injury update`,
					url: playerCardUrl,
				} satisfies NormalizedSearchResult
			})
		)
		.sort((left, right) => +new Date(right.publishedAt ?? 0) - +new Date(left.publishedAt ?? 0))
		.slice(0, 12)
}

function formatMoneyline(label: string, value: number | undefined) {
	if (typeof value !== 'number') {
		return null
	}

	return `${label} ML ${value > 0 ? `+${value}` : value}`
}

function formatAmericanValue(value: string | undefined) {
	if (!value) {
		return null
	}

	return value.startsWith('+') || value.startsWith('-') ? value : `${value}`
}

function buildMarketLineMovementSummary(odds: EspnOddsItem) {
	const openSpread = formatAmericanValue(odds.open?.pointSpread?.american)
	const currentSpread = formatAmericanValue(
		odds.current?.pointSpread?.american ?? odds.close?.pointSpread?.american
	)
	const awayOpenMoneyline = formatAmericanValue(odds.awayTeamOdds?.open?.moneyLine?.american)
	const awayCurrentMoneyline = formatAmericanValue(
		odds.awayTeamOdds?.current?.moneyLine?.american ?? odds.awayTeamOdds?.close?.moneyLine?.american
	)
	const homeOpenMoneyline = formatAmericanValue(odds.homeTeamOdds?.open?.moneyLine?.american)
	const homeCurrentMoneyline = formatAmericanValue(
		odds.homeTeamOdds?.current?.moneyLine?.american ?? odds.homeTeamOdds?.close?.moneyLine?.american
	)

	return [
		openSpread && currentSpread && openSpread !== currentSpread
			? `Spread moved from ${openSpread} to ${currentSpread}`
			: currentSpread
				? `Current spread ${currentSpread}`
				: null,
		awayOpenMoneyline && awayCurrentMoneyline && awayOpenMoneyline !== awayCurrentMoneyline
			? `Away moneyline moved from ${awayOpenMoneyline} to ${awayCurrentMoneyline}`
			: null,
		homeOpenMoneyline && homeCurrentMoneyline && homeOpenMoneyline !== homeCurrentMoneyline
			? `Home moneyline moved from ${homeOpenMoneyline} to ${homeCurrentMoneyline}`
			: null,
	]
		.filter(Boolean)
		.join('. ')
}

function isValidTimestamp(value: unknown): value is string {
	return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

function extractProviderBoardUpdatedAt(odds: EspnOddsItem) {
	const candidates = [
		odds.boardUpdatedAt,
		odds.lastUpdated,
		odds.displayDate,
		odds.openingDate,
		odds.date,
	]

	return candidates.find(isValidTimestamp) ?? null
}

function normalizeEspnOddsResults(
	league: SupportedLeague,
	sportPath: string,
	eventsWithOdds: Array<{ competition: EspnCompetition; event: EspnEvent; odds: EspnOddsItem }>,
	retrievedAt: string
) {
	return eventsWithOdds.map(({ competition, event, odds }, index) => {
		const awayTeam = competition.competitors?.find((team) => team.homeAway === 'away')
		const homeTeam = competition.competitors?.find((team) => team.homeAway === 'home')
		const boardUpdatedAt = extractProviderBoardUpdatedAt(odds)
		const providerName = odds.provider?.name?.replace('DraftKings', 'Draft Kings') ?? 'ESPN odds'
		const lineMovementSummary = buildMarketLineMovementSummary(odds)
		const moneylineSummary = [
			formatMoneyline(awayTeam?.team?.abbreviation ?? 'AWAY', odds.awayTeamOdds?.moneyLine),
			formatMoneyline(homeTeam?.team?.abbreviation ?? 'HOME', odds.homeTeamOdds?.moneyLine),
		]
			.filter(Boolean)
			.join('. ')

		return {
			id: `${event.id ?? competition.id ?? index}-odds`,
			metadata: {
				boardUpdatedAt,
				lineMovementSummary,
				league,
				marketSnapshot: {
					awayCurrentMoneyline:
						odds.awayTeamOdds?.current?.moneyLine?.american ??
						odds.awayTeamOdds?.close?.moneyLine?.american ??
						null,
					awayOpenMoneyline: odds.awayTeamOdds?.open?.moneyLine?.american ?? null,
					currentSpread:
						odds.current?.pointSpread?.american ?? odds.close?.pointSpread?.american ?? null,
					homeCurrentMoneyline:
						odds.homeTeamOdds?.current?.moneyLine?.american ??
						odds.homeTeamOdds?.close?.moneyLine?.american ??
						null,
					homeOpenMoneyline: odds.homeTeamOdds?.open?.moneyLine?.american ?? null,
					openSpread: odds.open?.pointSpread?.american ?? null,
				},
				providerName,
				retrievedAt,
			},
			publishedAt: boardUpdatedAt ?? retrievedAt,
			resultType: 'odds' satisfies SearchResultType,
			snippet: normalizeSnippet(
				`${odds.details ?? 'Market details unavailable'}. Total ${odds.overUnder ?? 'N/A'}. ${moneylineSummary}${moneylineSummary ? '.' : ''} ${lineMovementSummary ? `${lineMovementSummary}. ` : ''}${boardUpdatedAt ? `Board updated by ${providerName} at ${new Date(boardUpdatedAt).toLocaleString('en-US')}. ` : ''}Retrieved from ${providerName} at ${new Date(retrievedAt).toLocaleString('en-US')}. Over ${odds.overOdds ?? 'N/A'}, under ${odds.underOdds ?? 'N/A'}.`
			),
			sourceName: `${providerName} odds`,
			title: `${competition.name ?? event.name ?? event.shortName ?? 'Matchup'} odds snapshot`,
			url: buildEspnWebUrl(sportPath, 'scoreboard'),
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

export function buildSearchPromptContext(
	response: SearchResponse,
	options?: { maxResults?: number; personaSlug?: string | null }
) {
	if (response.results.length === 0) {
		return null
	}

	const maxResults = options?.maxResults ?? 4
	const guardrails = assessSearchGuardrails(response.query, response.results)

	const resultLines = response.results.slice(0, maxResults).map((result, index) => {
		const publishedDate = result.publishedAt
			? `Published: ${new Date(result.publishedAt).toLocaleDateString('en-US')}. `
			: ''

		return `${index + 1}. ${result.title} (${result.sourceName}). ${publishedDate}Snippet: ${result.snippet}. URL: ${result.url}`
	})

	const topOddsResult = response.results.find((result) => result.resultType === 'odds')
	const topOddsBoardUpdatedAt =
		typeof topOddsResult?.metadata?.boardUpdatedAt === 'string'
			? topOddsResult.metadata.boardUpdatedAt
			: null
	const topOddsRetrievedAt =
		typeof topOddsResult?.metadata?.retrievedAt === 'string'
			? topOddsResult.metadata.retrievedAt
			: null
	const topOddsLineMovementSummary =
		typeof topOddsResult?.metadata?.lineMovementSummary === 'string'
			? topOddsResult.metadata.lineMovementSummary
			: null

	return [
		'Live sports context is available for this answer.',
		'Use the retrieved context below as the factual source of truth for time-sensitive claims.',
		'Mention source names naturally when using a retrieved fact and do not invent live details beyond what is supported here.',
		'When you use a retrieved fact, cite it inline with bracketed result numbers like [1] or [2][3], matching the numbered list below.',
		guardrails.freshestPublishedAt
			? `Freshest retrieved timestamp: ${new Date(guardrails.freshestPublishedAt).toLocaleString('en-US')}.`
			: 'Retrieved sources do not all include trustworthy timestamps, so note when timing is uncertain.',
		options?.personaSlug === 'scout'
			? guardrails.hasStructuredResults
				? 'Scout note: lead with structured evidence and comparisons before leaning on narrative framing.'
				: 'Scout note: structured results were not retrieved, so say when the answer leans on narrative reporting instead of hard data.'
			: null,
		options?.personaSlug === 'vega' && guardrails.intent === 'odds'
			? !guardrails.hasOddsResults
				? 'Vega warning: no dedicated odds result was retrieved. Do not present a current spread, total, or moneyline as live; say the board is unavailable or may have moved and keep the answer informational.'
				: guardrails.freshnessStatus === 'stale'
					? `Vega warning: the freshest market context is older than ${guardrails.stalenessWindowHours} hours. Say the board may be stale before discussing any price.`
					: guardrails.freshnessStatus === 'unknown'
						? 'Vega warning: market timestamps are missing or incomplete. Say that freshness is unverified before discussing any price.'
						: topOddsBoardUpdatedAt
							? `Vega market snapshot: the visible board was updated by the provider at ${new Date(topOddsBoardUpdatedAt).toLocaleString('en-US')}.${topOddsLineMovementSummary ? ` ${topOddsLineMovementSummary}.` : ''}`
							: topOddsRetrievedAt
								? `Vega market snapshot: the visible board was retrieved from the provider at ${new Date(topOddsRetrievedAt).toLocaleString('en-US')}.${topOddsLineMovementSummary ? ` ${topOddsLineMovementSummary}.` : ''}`
								: 'Vega note: keep any odds framing tied to the retrieved sources and remind the user that market prices can move fast.'
			: null,
		options?.personaSlug === 'vega' && guardrails.intent === 'odds' && !guardrails.hasInjuryResults
			? 'Vega warning: dedicated injury results were not retrieved, so say lineup context may still move the market.'
			: null,
		...resultLines,
	]
		.filter(Boolean)
		.join(' ')
}

export function mergeSearchResponses(
	...inputs: Array<SearchResponse | SearchRankingOptions>
): SearchResponse {
	const maybeOptions = inputs.at(-1)
	const options =
		maybeOptions && !('query' in maybeOptions) ? (maybeOptions as SearchRankingOptions) : undefined
	const responses = options
		? (inputs.slice(0, -1) as SearchResponse[])
		: (inputs as SearchResponse[])
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
			responses.flatMap((response) => response.results),
			options
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

async function fetchJsonOrThrow<T>(fetchImpl: typeof fetch, url: string, errorMessage: string) {
	const response = await fetchImpl(url)

	if (!response.ok) {
		throw new Error(`${errorMessage} ${response.status}.`)
	}

	return (await response.json()) as T
}

async function fetchEspnOddsForCompetition(input: {
	competitionId: string
	coreLeague: string
	eventId: string
	fetchImpl: typeof fetch
	sport: string
}) {
	const response = await input.fetchImpl(
		`https://sports.core.api.espn.com/v2/sports/${input.sport}/leagues/${input.coreLeague}/events/${input.eventId}/competitions/${input.competitionId}/odds?lang=en&region=us`
	)

	if (!response.ok) {
		return null
	}

	const payload = (await response.json()) as { items?: EspnOddsItem[] }

	return payload.items?.[0] ?? null
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
	const intent = inferSearchIntent(query)

	if (prefersStandings(query)) {
		const payload = await fetchJsonOrThrow<{
			children?: Array<{ standings?: { entries?: EspnStandingEntry[] } }>
		}>(
			fetchImpl,
			`https://site.api.espn.com/apis/site/v2/sports/${sportPath}/standings`,
			'Structured sports data request failed with'
		)

		const entries = payload.children?.flatMap((child) => child.standings?.entries ?? []) ?? []

		return {
			freshness,
			league,
			provider,
			query,
			results: normalizeEspnStandingsResults(league, entries),
		}
	}

	if (prefersInjuries(query)) {
		const payload = await fetchJsonOrThrow<{ injuries?: EspnTeamInjuryEntry[] }>(
			fetchImpl,
			`https://site.api.espn.com/apis/site/v2/sports/${sportPath}/injuries`,
			'Structured sports data request failed with'
		)

		return {
			freshness,
			league,
			provider,
			query,
			results: rankSearchResults(
				query,
				normalizeEspnInjuryResults(league, sportPath, payload.injuries ?? [])
			),
		}
	}

	if (prefersOdds(query)) {
		const sport = sportPath.split('/')[0] ?? 'football'
		const coreLeague = leagueToEspnCoreLeague(league)
		const retrievedAt = new Date().toISOString()
		const [scoreboardPayload, injuriesPayload] = await Promise.all([
			fetchJsonOrThrow<{ events?: EspnEvent[] }>(
				fetchImpl,
				`https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`,
				'Structured sports data request failed with'
			),
			fetchJsonOrThrow<{ injuries?: EspnTeamInjuryEntry[] }>(
				fetchImpl,
				`https://site.api.espn.com/apis/site/v2/sports/${sportPath}/injuries`,
				'Structured sports data request failed with'
			),
		])

		const events = scoreboardPayload.events ?? []
		const oddsEntries = await Promise.all(
			events.slice(0, 12).map(async (event) => {
				const competition = event.competitions?.[0]

				if (!event.id || !competition?.id) {
					return null
				}

				const odds = await fetchEspnOddsForCompetition({
					competitionId: competition.id,
					coreLeague,
					eventId: event.id,
					fetchImpl,
					sport,
				})

				if (!odds) {
					return null
				}

				return { competition, event, odds }
			})
		)

		const oddsResults = normalizeEspnOddsResults(
			league,
			sportPath,
			oddsEntries.flatMap((entry) => (entry ? [entry] : [])),
			retrievedAt
		)
		const injuryResults = normalizeEspnInjuryResults(
			league,
			sportPath,
			injuriesPayload.injuries ?? []
		)

		return {
			freshness,
			league,
			provider,
			query,
			results: rankSearchResults(query, [...oddsResults, ...injuryResults]),
			warning:
				oddsResults.length === 0
					? 'No dedicated structured odds board was available from ESPN for the current slate.'
					: undefined,
		}
	}

	const payload = await fetchJsonOrThrow<{ events?: EspnEvent[] }>(
		fetchImpl,
		`https://site.api.espn.com/apis/site/v2/sports/${sportPath}/scoreboard`,
		'Structured sports data request failed with'
	)

	return {
		freshness,
		league,
		provider,
		query,
		results: rankSearchResults(query, normalizeEspnScoreboardResults(league, payload.events ?? [])),
	}
}
