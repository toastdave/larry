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
		...resultLines,
	].join(' ')
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
