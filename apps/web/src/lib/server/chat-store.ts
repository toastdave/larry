import { db } from '$lib/server/db'
import {
	citation,
	conversation,
	message,
	messagePart,
	type messageRoleEnum,
	providerEvent,
	searchQuery,
	searchResult,
	usageLedger,
	userTeamPreference,
} from '@larry/db/schema'
import {
	type NormalizedSearchResult,
	type SearchResultType,
	formatCitationLabel,
	inferCitationKind,
	requiresFreshSearch,
} from '@larry/search'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import { buildConversationSlug, buildConversationTitle } from './chat-helpers'

type MessageRole = (typeof messageRoleEnum.enumValues)[number]

export type ConversationSummary = {
	createdAt: Date
	id: string
	lastMessageAt: Date | null
	slug: string
	title: string
	updatedAt: Date
}

export type StoredMessage = {
	citations: StoredCitation[]
	contentText: string | null
	createdAt: Date
	id: string
	role: MessageRole
	searchRequired: boolean
}

export type StoredCitation = {
	citedText: string | null
	id: string
	kind: 'article' | 'injury' | 'odds' | 'score' | 'standings'
	label: string
	sourceName: string
	url: string
}

export type StartedConversationTurn = {
	conversation: ConversationSummary
	favoriteTeam: string | null
	historyMessages: StoredMessage[]
	userMessage: StoredMessage
}

type AssistantMetadata = {
	[key: string]: unknown
	errorMessage?: string
	fallback?: boolean
	finishReason?: string | null
	providerMetadata?: unknown
	routeMode?: 'hosted' | 'local'
	usage?: unknown
}

export async function listConversationsForUser(userId: string) {
	return db
		.select({
			createdAt: conversation.createdAt,
			id: conversation.id,
			lastMessageAt: conversation.lastMessageAt,
			slug: conversation.slug,
			title: conversation.title,
			updatedAt: conversation.updatedAt,
		})
		.from(conversation)
		.where(eq(conversation.ownerUserId, userId))
		.orderBy(desc(conversation.updatedAt))
		.limit(24)
}

export async function loadConversationForUser(userId: string, slug: string | null | undefined) {
	const conversations = await listConversationsForUser(userId)
	const activeConversation = slug
		? (conversations.find((entry) => entry.slug === slug) ?? conversations[0] ?? null)
		: (conversations[0] ?? null)

	if (!activeConversation) {
		return {
			activeConversation: null,
			conversations,
			messages: [] as StoredMessage[],
		}
	}

	const messages = await getConversationMessages(activeConversation.id)

	return {
		activeConversation,
		conversations,
		messages,
	}
}

async function getConversationMessages(conversationId: string) {
	const messages = await db
		.select({
			citationCount: message.citationCount,
			contentText: message.contentText,
			createdAt: message.createdAt,
			id: message.id,
			role: message.role,
			searchRequired: message.searchRequired,
		})
		.from(message)
		.where(eq(message.conversationId, conversationId))
		.orderBy(asc(message.createdAt))

	if (messages.length === 0) {
		return []
	}

	const citations = await db
		.select({
			citedText: citation.citedText,
			id: citation.id,
			kind: citation.kind,
			label: citation.label,
			messageId: citation.messageId,
			sourceName: citation.sourceName,
			url: citation.url,
		})
		.from(citation)
		.where(
			inArray(
				citation.messageId,
				messages.map((entry) => entry.id)
			)
		)

	const citationsByMessage = new Map<string, StoredCitation[]>()

	for (const item of citations) {
		const entry = citationsByMessage.get(item.messageId) ?? []
		entry.push({
			citedText: item.citedText,
			id: item.id,
			kind: item.kind,
			label: item.label,
			sourceName: item.sourceName,
			url: item.url,
		})
		citationsByMessage.set(item.messageId, entry)
	}

	return messages.map(({ citationCount: _citationCount, ...entry }) => ({
		...entry,
		citations: citationsByMessage.get(entry.id) ?? [],
	}))
}

async function getFavoriteTeam(userId: string) {
	const [favoriteTeam] = await db
		.select({ teamName: userTeamPreference.teamName })
		.from(userTeamPreference)
		.where(and(eq(userTeamPreference.userId, userId), eq(userTeamPreference.affinity, 'favorite')))
		.limit(1)

	return favoriteTeam?.teamName ?? null
}

async function createConversationForUser(userId: string, prompt: string) {
	const [createdConversation] = await db
		.insert(conversation)
		.values({
			ownerUserId: userId,
			slug: buildConversationSlug(prompt),
			title: buildConversationTitle(prompt),
			updatedAt: new Date(),
		})
		.returning({
			createdAt: conversation.createdAt,
			id: conversation.id,
			lastMessageAt: conversation.lastMessageAt,
			slug: conversation.slug,
			title: conversation.title,
			updatedAt: conversation.updatedAt,
		})

	return createdConversation
}

async function insertMessageRecord(input: {
	contentText: string
	conversationId: string
	model?: string | null
	role: MessageRole
	searchRequired?: boolean
}): Promise<StoredMessage> {
	const [createdMessage] = await db
		.insert(message)
		.values({
			contentText: input.contentText,
			conversationId: input.conversationId,
			model: input.model,
			role: input.role,
			searchRequired: input.searchRequired ?? false,
		})
		.returning({
			contentText: message.contentText,
			createdAt: message.createdAt,
			id: message.id,
			role: message.role,
			searchRequired: message.searchRequired,
		})

	await db.insert(messagePart).values({
		messageId: createdMessage.id,
		partOrder: 0,
		textValue: input.contentText,
		type: 'text',
	})

	return {
		...createdMessage,
		citations: [],
	}
}

async function touchConversation(conversationId: string) {
	const now = new Date()

	const [updatedConversation] = await db
		.update(conversation)
		.set({
			lastMessageAt: now,
			updatedAt: now,
		})
		.where(eq(conversation.id, conversationId))
		.returning({
			createdAt: conversation.createdAt,
			id: conversation.id,
			lastMessageAt: conversation.lastMessageAt,
			slug: conversation.slug,
			title: conversation.title,
			updatedAt: conversation.updatedAt,
		})

	return updatedConversation
}

export async function startConversationTurn(input: {
	conversationSlug?: string | null
	prompt: string
	userId: string
}) {
	const prompt = input.prompt.trim()

	if (!prompt) {
		throw new Error('Prompt is required')
	}

	const existingConversation = input.conversationSlug
		? await db.query.conversation.findFirst({
				where: and(
					eq(conversation.ownerUserId, input.userId),
					eq(conversation.slug, input.conversationSlug)
				),
			})
		: null

	const activeConversation =
		existingConversation ?? (await createConversationForUser(input.userId, prompt))

	const userMessage = await insertMessageRecord({
		contentText: prompt,
		conversationId: activeConversation.id,
		role: 'user',
		searchRequired: requiresFreshSearch(prompt),
	})

	const [favoriteTeam, historyMessages] = await Promise.all([
		getFavoriteTeam(input.userId),
		getConversationMessages(activeConversation.id),
	])

	return {
		conversation: activeConversation,
		favoriteTeam,
		historyMessages,
		userMessage,
	} satisfies StartedConversationTurn
}

export async function recordModelProviderEvent(input: {
	payload: Record<string, unknown>
	providerName: string
	providerKind?: 'billing' | 'model' | 'search' | 'sports_data'
	referenceId?: string | null
}) {
	await db.insert(providerEvent).values({
		payload: input.payload,
		providerKind: input.providerKind ?? 'model',
		providerName: input.providerName,
		referenceId: input.referenceId ?? null,
	})
}

export async function recordSearchArtifacts(input: {
	conversationId: string
	messageId: string
	providerName: string
	queryText: string
	results: NormalizedSearchResult[]
	userId: string
	warning?: string
	league?: string | null
	freshness?: string | null
}) {
	const [storedSearchQuery] = await db
		.insert(searchQuery)
		.values({
			conversationId: input.conversationId,
			freshness: input.freshness,
			league: input.league,
			provider: input.providerName,
			queryText: input.queryText,
		})
		.returning({ id: searchQuery.id })

	const storedResults =
		input.results.length > 0
			? await db
					.insert(searchResult)
					.values(
						input.results.map((result, index) => ({
							metadata: result.metadata ?? {},
							providerResultId: result.id,
							publishedAt: result.publishedAt ? new Date(result.publishedAt) : null,
							ranking: index,
							resultType: result.resultType,
							searchQueryId: storedSearchQuery.id,
							snippet: result.snippet,
							sourceName: result.sourceName,
							title: result.title,
							url: result.url,
						}))
					)
					.returning({
						id: searchResult.id,
						publishedAt: searchResult.publishedAt,
						resultType: searchResult.resultType,
						snippet: searchResult.snippet,
						sourceName: searchResult.sourceName,
						title: searchResult.title,
						url: searchResult.url,
					})
			: []

	await Promise.all([
		recordModelProviderEvent({
			payload: {
				conversationId: input.conversationId,
				messageId: input.messageId,
				queryText: input.queryText,
				resultCount: storedResults.length,
				warning: input.warning ?? null,
			},
			providerKind: 'search',
			providerName: input.providerName,
			referenceId: storedSearchQuery.id,
		}),
		db.insert(usageLedger).values({
			conversationId: input.conversationId,
			costInCents: 0,
			description: 'Live sports search retrieval',
			entryType: 'search',
			messageId: input.messageId,
			metadata: {
				queryText: input.queryText,
				resultCount: storedResults.length,
				warning: input.warning ?? null,
			},
			provider: input.providerName,
			units: Math.max(storedResults.length, 1),
			userId: input.userId,
		}),
	])

	return {
		results: storedResults.map((result) => ({
			citedText: result.snippet,
			kind: inferCitationKind(result.resultType as SearchResultType),
			label: formatCitationLabel({
				publishedAt: result.publishedAt?.toISOString() ?? null,
				sourceName: result.sourceName,
			}),
			searchResultId: result.id,
			sourceName: result.sourceName,
			url: result.url,
		})),
		searchQueryId: storedSearchQuery.id,
	}
}

export async function finishAssistantTurn(input: {
	citations?: Array<{
		citedText?: string | null
		kind: 'article' | 'injury' | 'odds' | 'score' | 'standings'
		label: string
		searchResultId?: string | null
		sourceName: string
		url: string
	}>
	conversationId: string
	metadata?: AssistantMetadata
	model: string
	providerName: string
	replyText: string
	userId: string
}) {
	const assistantMessage = await insertMessageRecord({
		contentText: input.replyText,
		conversationId: input.conversationId,
		model: input.model,
		role: 'assistant',
	})

	const citations = input.citations ?? []

	if (citations.length > 0) {
		await db.insert(citation).values(
			citations.map((item) => ({
				citedText: item.citedText ?? null,
				kind: item.kind,
				label: item.label,
				messageId: assistantMessage.id,
				searchResultId: item.searchResultId ?? null,
				sourceName: item.sourceName,
				url: item.url,
			}))
		)

		await db
			.update(message)
			.set({ citationCount: citations.length })
			.where(eq(message.id, assistantMessage.id))
	}

	const updatedConversation = await touchConversation(input.conversationId)

	await Promise.all([
		recordModelProviderEvent({
			payload: {
				...input.metadata,
				conversationId: input.conversationId,
				messageId: assistantMessage.id,
				model: input.model,
				replyLength: input.replyText.length,
			},
			providerName: input.providerName,
			referenceId: assistantMessage.id,
		}),
		db.insert(usageLedger).values({
			conversationId: input.conversationId,
			costInCents: 0,
			description: 'Chat response generation',
			entryType: 'inference',
			messageId: assistantMessage.id,
			metadata: {
				...input.metadata,
				model: input.model,
				providerName: input.providerName,
			},
			model: input.model,
			provider: input.providerName,
			units: 1,
			userId: input.userId,
		}),
	])

	return {
		assistantMessage: {
			...assistantMessage,
			citations: citations.map((item, index) => ({
				citedText: item.citedText ?? null,
				id: `citation-${assistantMessage.id}-${index}`,
				kind: item.kind,
				label: item.label,
				sourceName: item.sourceName,
				url: item.url,
			})),
		},
		conversation: updatedConversation,
	}
}
