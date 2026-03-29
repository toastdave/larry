import { sendMessageForUser } from '$lib/server/chat-store'
import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

type ChatRequest = {
	conversationSlug?: string | null
	prompt?: string
}

function streamChatResponse(payload: Awaited<ReturnType<typeof sendMessageForUser>>) {
	const encoder = new TextEncoder()

	return new ReadableStream({
		async start(controller) {
			controller.enqueue(
				encoder.encode(`${JSON.stringify({ type: 'meta', conversation: payload.conversation })}\n`)
			)

			for (const chunk of payload.streamChunks) {
				controller.enqueue(encoder.encode(`${JSON.stringify({ type: 'chunk', value: chunk })}\n`))
				await Bun.sleep(35)
			}

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

	const body = (await request.json()) as ChatRequest
	const prompt = body.prompt?.trim()

	if (!prompt) {
		throw error(400, 'Prompt is required.')
	}

	const payload = await sendMessageForUser({
		conversationSlug: body.conversationSlug,
		prompt,
		userId: locals.user.id,
	})

	return new Response(streamChatResponse(payload), {
		headers: {
			'Cache-Control': 'no-cache, no-transform',
			Connection: 'keep-alive',
			'Content-Type': 'application/x-ndjson; charset=utf-8',
		},
	})
}
