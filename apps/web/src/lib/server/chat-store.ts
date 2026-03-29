import { db } from '$lib/server/db'
import {
	conversation,
	message,
	messagePart,
	type messageRoleEnum,
	providerEvent,
	usageLedger,
	userTeamPreference,
} from '@larry/db/schema'
import { requiresFreshSearch } from '@larry/search'
import { and, asc, desc, eq } from 'drizzle-orm'
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
	contentText: string | null
	createdAt: Date
	id: string
	role: MessageRole
	searchRequired: boolean
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
	return db
		.select({
			contentText: message.contentText,
			createdAt: message.createdAt,
			id: message.id,
			role: message.role,
			searchRequired: message.searchRequired,
		})
		.from(message)
		.where(eq(message.conversationId, conversationId))
		.orderBy(asc(message.createdAt))
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
}) {
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

	return createdMessage
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
	referenceId?: string | null
}) {
	await db.insert(providerEvent).values({
		payload: input.payload,
		providerKind: 'model',
		providerName: input.providerName,
		referenceId: input.referenceId ?? null,
	})
}

export async function finishAssistantTurn(input: {
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
		assistantMessage,
		conversation: updatedConversation,
	}
}
