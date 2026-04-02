import { createOpenAI } from '@ai-sdk/openai'
import { type SportsPersonaSlug, createSystemPrompt } from '@larry/ai'
import { type ModelMessage, streamText } from 'ai'
import type { StoredMessage } from './chat-store'

const defaultHostedModel = 'google/gemini-2.5-flash'
const defaultLocalModel = 'llama3.1:8b'
const defaultOllamaBaseUrl = 'http://127.0.0.1:11434/v1'

export type ChatProviderRoute = {
	mode: 'hosted' | 'local'
	modelId: string
	providerName: 'google-gemini' | 'ollama'
}

function normalizeProviderTarget(value: string | undefined) {
	if (value === 'hosted' || value === 'local') {
		return value
	}

	return process.env.NODE_ENV === 'production' ? 'hosted' : 'local'
}

export function resolveChatProviderRoute(): ChatProviderRoute {
	const target = normalizeProviderTarget(process.env.AI_PROVIDER_TARGET)

	if (target === 'local') {
		return {
			mode: 'local',
			modelId: process.env.AI_LOCAL_MODEL || defaultLocalModel,
			providerName: 'ollama',
		}
	}

	return {
		mode: 'hosted',
		modelId: process.env.AI_HOSTED_MODEL || defaultHostedModel,
		providerName: 'google-gemini',
	}
}

export function buildModelMessages(messages: StoredMessage[]) {
	return messages.flatMap((message) => {
		if (!message.contentText) {
			return []
		}

		if (message.role === 'assistant' || message.role === 'system' || message.role === 'user') {
			return [{ content: message.contentText, role: message.role }] satisfies ModelMessage[]
		}

		return []
	})
}

export function createChatTextStream(input: {
	fanBio?: string | null
	favoriteTeam?: string | null
	favoriteSportsMoment?: string | null
	location?: string | null
	messages: StoredMessage[]
	onFinish?: (event: {
		finishReason?: string | null
		providerMetadata?: unknown
		usage?: unknown
	}) => Promise<void> | void
	personaSlug?: SportsPersonaSlug | string | null
	rivalTeam?: string | null
	searchContext?: string | null
}) {
	const route = resolveChatProviderRoute()
	const model =
		route.mode === 'local'
			? createOpenAI({
					apiKey: process.env.AI_OLLAMA_API_KEY || 'ollama',
					baseURL: process.env.AI_OLLAMA_BASE_URL || defaultOllamaBaseUrl,
					name: 'ollama',
				}).chat(route.modelId)
			: route.modelId

	const result = streamText({
		maxOutputTokens: 380,
		messages: buildModelMessages(input.messages),
		model,
		onFinish: async (event) => {
			await input.onFinish?.({
				finishReason: event.finishReason,
				providerMetadata: event.providerMetadata,
				usage: event.totalUsage,
			})
		},
		system: [
			createSystemPrompt({
				fanBio: input.fanBio,
				favoriteTeam: input.favoriteTeam,
				favoriteSportsMoment: input.favoriteSportsMoment,
				location: input.location,
				persona: input.personaSlug,
				rivalTeam: input.rivalTeam,
			}),
			input.searchContext,
		]
			.filter(Boolean)
			.join(' '),
		temperature: 0.8,
	})

	return { result, route }
}
