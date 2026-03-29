import {
	type CitationKind,
	type SearchResponse,
	buildSearchPromptContext,
	searchSportsWeb,
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
	const response = await searchSportsWeb({
		apiKey: process.env.SEARCH_API_KEY,
		provider: process.env.SEARCH_PROVIDER,
		query: input.prompt,
	})

	const stored = await recordSearchArtifacts({
		conversationId: input.conversationId,
		freshness: response.freshness,
		league: response.league,
		messageId: input.messageId,
		providerName: response.provider,
		queryText: response.query,
		results: response.results,
		userId: input.userId,
		warning: response.warning,
	})

	return {
		citations: stored.results.slice(0, 3),
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
