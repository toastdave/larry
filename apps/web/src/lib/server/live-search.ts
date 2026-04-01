import {
	type CitationKind,
	type NormalizedSearchResult,
	type SearchGuardrailAssessment,
	type SearchResponse,
	assessSearchGuardrails,
	buildSearchPromptContext,
	formatCitationLabel,
	inferCitationKind,
	mergeSearchResponses,
	searchSportsWeb,
	searchStructuredSportsData,
} from '@larry/search'
import { recordModelProviderEvent, recordSearchArtifacts } from './chat-store'

function toCitationLookupKey(input: {
	sourceName: string
	title: string
	url: string
}) {
	return `${input.sourceName}::${input.title}::${input.url}`.toLowerCase()
}

function toFallbackCitation(result: NormalizedSearchResult) {
	return {
		citedText: result.snippet,
		kind: inferCitationKind(result.resultType),
		label: formatCitationLabel({
			publishedAt: result.publishedAt ?? null,
			sourceName: result.sourceName,
		}),
		sourceName: result.sourceName,
		url: result.url,
	}
}

export type PreparedSearchContext = {
	citations: Array<{
		citedText?: string | null
		kind: CitationKind
		label: string
		searchResultId?: string | null
		sourceName: string
		url: string
	}>
	guardrails: SearchGuardrailAssessment
	promptContext: string | null
	response: SearchResponse
}

export async function prepareSearchContext(input: {
	conversationId: string
	messageId: string
	personaSlug?: string | null
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

	const response = mergeSearchResponses(sportsDataResponse, webResponse, {
		personaSlug: input.personaSlug,
	})
	const storedCitations = [...sportsDataStored.results, ...webStored.results]
	const citationLookup = new Map(
		storedCitations.map((citation) => [
			toCitationLookupKey({
				sourceName: citation.sourceName,
				title: citation.title,
				url: citation.url,
			}),
			citation,
		])
	)

	const citations = response.results.slice(0, 4).map((result) => {
		return (
			citationLookup.get(
				toCitationLookupKey({
					sourceName: result.sourceName,
					title: result.title,
					url: result.url,
				})
			) ?? toFallbackCitation(result)
		)
	})
	const guardrails = assessSearchGuardrails(response.query, response.results)

	await recordModelProviderEvent({
		payload: {
			combinedProvider: response.provider,
			conversationId: input.conversationId,
			freshestPublishedAt: guardrails.freshestPublishedAt,
			freshnessStatus: guardrails.freshnessStatus,
			hasInjuryResults: guardrails.hasInjuryResults,
			hasOddsResults: guardrails.hasOddsResults,
			intent: guardrails.intent,
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
		guardrails,
		promptContext: buildSearchPromptContext(response, {
			personaSlug: input.personaSlug,
		}),
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
