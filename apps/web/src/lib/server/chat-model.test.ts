import { describe, expect, test } from 'bun:test'
import { buildModelMessages, resolveChatProviderRoute } from './chat-model'
import type { StoredMessage } from './chat-store'

describe('chat model helpers', () => {
	test('builds model messages from persisted chat rows', () => {
		const messages = buildModelMessages([
			{
				citations: [],
				contentText: 'Talk to me about the Bills',
				createdAt: new Date(),
				id: '1',
				role: 'user',
				searchRequired: false,
			},
			{
				citations: [],
				contentText: 'The Bills are a weekly trust exercise.',
				createdAt: new Date(),
				id: '2',
				role: 'assistant',
				searchRequired: false,
			},
		] satisfies StoredMessage[])

		expect(messages).toEqual([
			{ content: 'Talk to me about the Bills', role: 'user' },
			{ content: 'The Bills are a weekly trust exercise.', role: 'assistant' },
		])
	})

	test('prefers explicit provider target from the environment', () => {
		const originalTarget = process.env.AI_PROVIDER_TARGET
		const originalHostedModel = process.env.AI_HOSTED_MODEL

		process.env.AI_PROVIDER_TARGET = 'hosted'
		process.env.AI_HOSTED_MODEL = 'google/gemini-2.5-pro'

		const route = resolveChatProviderRoute()

		expect(route).toEqual({
			mode: 'hosted',
			modelId: 'google/gemini-2.5-pro',
			providerName: 'google-gemini',
		})

		process.env.AI_PROVIDER_TARGET = originalTarget ?? ''
		process.env.AI_HOSTED_MODEL = originalHostedModel ?? ''
	})
})
