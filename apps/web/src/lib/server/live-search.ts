import {
	type CitationKind,
	type SearchResponse,
	buildSearchPromptContext,
	mergeSearchResponses,
	searchSportsWeb,
	searchStructuredSportsData,
} from '@larry/search'
import { recordModelProviderEvent, recordSearchArtifacts } from './chat-store'

export type PreparedSearchContext = {
	citations: Array<{
		citedText?: string | null
		kind: CitationKind
		label: string
		searchResultId?: string | null
		sourceName: string
		url: string
	}>
	promptContext: string | null
	response: SearchResponse
}

export async function prepareSearchContext(input: {
	conversationId: string
	messageId: string
	prompt: string
	userId: string
}) {
	const [sportsDataResponse, webResponse] = await Promise.all([
		searchStructuredSportsData({
			provider: process.env.SPORTS_DATA_PROVIDER,
			query: input.prompt,
		}),
		searchSportsWeb({
			apiKey: process.env.SEARCH_API_KEY,
			provider: process.env.SEARCH_PROVIDER,
			query: input.prompt,
		}),
	])

	const [sportsDataStored, webStored] = await Promise.all([
		recordSearchArtifacts({
			conversationId: input.conversationId,
			freshness: sportsDataResponse.freshness,
			league: sportsDataResponse.league,
			messageId: input.messageId,
			providerName: sportsDataResponse.provider,
			queryText: sportsDataResponse.query,
			results: sportsDataResponse.results,
			userId: input.userId,
			warning: sportsDataResponse.warning,
		}),
		recordSearchArtifacts({
			conversationId: input.conversationId,
			freshness: webResponse.freshness,
			league: webResponse.league,
			messageId: input.messageId,
			providerName: webResponse.provider,
			queryText: webResponse.query,
			results: webResponse.results,
			userId: input.userId,
			warning: webResponse.warning,
		}),
	])

	const response = mergeSearchResponses(sportsDataResponse, webResponse)

	const citations = [...sportsDataStored.results, ...webStored.results].slice(0, 4)

	await recordModelProviderEvent({
		payload: {
			combinedProvider: response.provider,
			conversationId: input.conversationId,
			messageId: input.messageId,
			queryText: input.prompt,
			structuredResultCount: sportsDataResponse.results.length,
			webResultCount: webResponse.results.length,
		},
		providerKind: 'search',
		providerName: 'combined-search',
		referenceId: input.messageId,
	})

	return {
		citations,
		promptContext: buildSearchPromptContext(response),
		response,
	} satisfies PreparedSearchContext
}

export async function recordSearchFailure(input: {
	conversationId: string
	errorMessage: string
	messageId: string
	prompt: string
	providerName: string
}) {
	await recordModelProviderEvent({
		payload: {
			conversationId: input.conversationId,
			errorMessage: input.errorMessage,
			messageId: input.messageId,
			queryText: input.prompt,
			stage: 'search',
		},
		providerKind: 'search',
		providerName: input.providerName,
		referenceId: input.messageId,
	})
}
