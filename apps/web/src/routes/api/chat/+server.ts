import { buildLocalReply, chunkTextForStreaming } from '$lib/server/chat-helpers'
import { createChatTextStream } from '$lib/server/chat-model'
import {
	finishAssistantTurn,
	recordModelProviderEvent,
	startConversationTurn,
} from '$lib/server/chat-store'
import { prepareSearchContext, recordSearchFailure } from '$lib/server/live-search'
import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

type ChatRequest = {
	conversationSlug?: string | null
	personaSlug?: string | null
	prompt?: string
}

type FinalPayload = {
	assistantMessage: Awaited<ReturnType<typeof finishAssistantTurn>>['assistantMessage']
	conversation: Awaited<ReturnType<typeof finishAssistantTurn>>['conversation']
	userMessage: Awaited<ReturnType<typeof startConversationTurn>>['userMessage']
}

function streamChatResponse(input: {
	conversation: Awaited<ReturnType<typeof startConversationTurn>>['conversation']
	createFinalPayload: () => Promise<FinalPayload>
	streamChunks: () => AsyncGenerator<string>
}) {
	const encoder = new TextEncoder()

	return new ReadableStream({
		async start(controller) {
			controller.enqueue(
				encoder.encode(`${JSON.stringify({ type: 'meta', conversation: input.conversation })}\n`)
			)

			for await (const chunk of input.streamChunks()) {
				controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'chunk', value: chunk })}\n`))
			}

			const payload = await input.createFinalPayload()

			controller.enqueue(
				encoder.encode(
					`${JSON.stringify({
						type: 'done',
						assistantMessage: payload.assistantMessage,
						conversation: payload.conversation,
						userMessage: payload.userMessage,
					})}\n`
				)
			)

			controller.close()
		},
	})
}

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.user) {
		throw error(401, 'You must be signed in to chat.')
	}

	const userId = locals.user.id

	const body = (await request.json()) as ChatRequest
	const prompt = body.prompt?.trim()

	if (!prompt) {
		throw error(400, 'Prompt is required.')
	}

	const startedTurn = await startConversationTurn({
		conversationSlug: body.conversationSlug,
		personaSlug: body.personaSlug,
		prompt,
		userId,
	})

	let searchContext: Awaited<ReturnType<typeof prepareSearchContext>> | null = null
	let searchFailureMessage: string | null = null

	if (startedTurn.userMessage.searchRequired) {
		try {
			searchContext = await prepareSearchContext({
				conversationId: startedTurn.conversation.id,
				messageId: startedTurn.userMessage.id,
				prompt,
				userId,
			})
		} catch (cause) {
			searchFailureMessage =
				cause instanceof Error ? cause.message : 'Search provider failed before answer generation.'

			await recordSearchFailure({
				conversationId: startedTurn.conversation.id,
				errorMessage: searchFailureMessage,
				messageId: startedTurn.userMessage.id,
				prompt,
				providerName: process.env.SEARCH_PROVIDER || 'tavily',
			})
		}
	}

	let finalPayloadPromise: Promise<FinalPayload> | null = null

	return new Response(
		streamChatResponse({
			conversation: startedTurn.conversation,
			createFinalPayload: async () => {
				if (!finalPayloadPromise) {
					throw new Error('Chat response never finalized.')
				}

				return finalPayloadPromise
			},
			streamChunks: async function* () {
				if (
					startedTurn.userMessage.searchRequired &&
					(!searchContext || searchContext.response.results.length === 0)
				) {
					const fallbackReply = buildLocalReply({
						favoriteTeam: startedTurn.favoriteTeam,
						historyCount: startedTurn.historyMessages.length,
						personaSlug: startedTurn.personaSlug,
						prompt,
					})

					for (const chunk of chunkTextForStreaming(fallbackReply)) {
						yield chunk
					}

					finalPayloadPromise = finishAssistantTurn({
						conversationId: startedTurn.conversation.id,
						metadata: {
							fallback: true,
							searchFailureMessage,
							searchWarning: searchContext?.response.warning ?? null,
						},
						model: 'larry-local-fallback',
						providerName: 'fallback',
						replyText: fallbackReply,
						userId,
					}).then((assistantResult) => ({
						assistantMessage: assistantResult.assistantMessage,
						conversation: assistantResult.conversation,
						userMessage: startedTurn.userMessage,
					}))

					return
				}

				let finishReason: string | null | undefined
				let providerMetadata: unknown
				let responseText = ''
				let usage: unknown

				const chatStream = createChatTextStream({
					favoriteTeam: startedTurn.favoriteTeam,
					messages: startedTurn.historyMessages,
					onFinish: async (event) => {
						finishReason = event.finishReason
						providerMetadata = event.providerMetadata
						usage = event.usage
					},
					personaSlug: startedTurn.personaSlug,
					searchContext: searchContext?.promptContext,
				})

				try {
					for await (const chunk of chatStream.result.textStream) {
						responseText += chunk
						yield chunk
					}

					const trimmedResponse = responseText.trim()

					if (trimmedResponse) {
						finalPayloadPromise = finishAssistantTurn({
							citations: searchContext?.citations,
							conversationId: startedTurn.conversation.id,
							metadata: {
								finishReason,
								providerMetadata,
								routeMode: chatStream.route.mode,
								searchProvider: searchContext?.response.provider ?? null,
								searchResultCount: searchContext?.response.results.length ?? 0,
								searchWarning: searchContext?.response.warning ?? null,
								usage,
							},
							model: chatStream.route.modelId,
							providerName: chatStream.route.providerName,
							replyText: trimmedResponse,
							userId,
						}).then((assistantResult) => ({
							assistantMessage: assistantResult.assistantMessage,
							conversation: assistantResult.conversation,
							userMessage: startedTurn.userMessage,
						}))

						return
					}
				} catch (cause) {
					const errorMessage = cause instanceof Error ? cause.message : 'Unknown AI provider error.'

					await recordModelProviderEvent({
						payload: {
							conversationId: startedTurn.conversation.id,
							errorMessage,
							model: chatStream.route.modelId,
							routeMode: chatStream.route.mode,
							stage: 'stream',
						},
						providerName: chatStream.route.providerName,
						referenceId: startedTurn.userMessage.id,
					})
				}

				const fallbackReply = buildLocalReply({
					favoriteTeam: startedTurn.favoriteTeam,
					historyCount: startedTurn.historyMessages.length,
					personaSlug: startedTurn.personaSlug,
					prompt,
				})

				if (!responseText) {
					for (const chunk of chunkTextForStreaming(fallbackReply)) {
						yield chunk
					}
				}

				finalPayloadPromise = finishAssistantTurn({
					conversationId: startedTurn.conversation.id,
					metadata: {
						attemptedModel: chatStream.route.modelId,
						attemptedProvider: chatStream.route.providerName,
						fallback: true,
						finishReason,
						providerMetadata,
						routeMode: chatStream.route.mode,
						searchProvider: searchContext?.response.provider ?? null,
						searchResultCount: searchContext?.response.results.length ?? 0,
						searchWarning: searchContext?.response.warning ?? null,
						usage,
					},
					model: 'larry-local-fallback',
					providerName: 'fallback',
					replyText: fallbackReply,
					userId,
				}).then((assistantResult) => ({
					assistantMessage: assistantResult.assistantMessage,
					conversation: assistantResult.conversation,
					userMessage: startedTurn.userMessage,
				}))
			},
		}),
		{
			headers: {
				'Cache-Control': 'no-cache, no-transform',
				Connection: 'keep-alive',
				'Content-Type': 'application/x-ndjson; charset=utf-8',
			},
		}
	)
}
