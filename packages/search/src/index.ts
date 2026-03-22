export const supportedLeagues = ['NFL', 'NBA', 'MLB', 'NCAAF', 'NCAAB'] as const

export type SupportedLeague = (typeof supportedLeagues)[number]

export type NormalizedSearchResult = {
	id: string
	title: string
	url: string
	sourceName: string
	snippet: string
	publishedAt?: string | null
	resultType: 'article' | 'scoreboard' | 'standing' | 'injury' | 'odds'
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
