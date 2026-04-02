import { applyPolarCustomerStateWebhook, hasProcessedBillingEvent } from '$lib/server/polar'
import { WebhookVerificationError, validateEvent } from '@polar-sh/sdk/webhooks'
import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

function getWebhookHeaders(headers: Headers) {
	const relevantHeaders = ['webhook-id', 'webhook-signature', 'webhook-timestamp'] as const

	return relevantHeaders.reduce(
		(result, header) => {
			const value = headers.get(header)

			if (value) {
				result[header] = value
			}

			return result
		},
		{} as Record<string, string>
	)
}

export const POST: RequestHandler = async ({ request }) => {
	const webhookSecret = process.env.POLAR_WEBHOOK_SECRET

	if (!webhookSecret) {
		throw error(503, 'POLAR_WEBHOOK_SECRET is missing.')
	}

	const rawBody = await request.text()
	const webhookHeaders = getWebhookHeaders(request.headers)
	const webhookId = request.headers.get('webhook-id')

	if (!webhookId) {
		throw error(400, 'Missing Polar webhook id header.')
	}

	try {
		const event = validateEvent(rawBody, webhookHeaders, webhookSecret)

		if (await hasProcessedBillingEvent(webhookId)) {
			return json({ duplicate: true, ok: true }, { status: 202 })
		}

		if (event.type === 'customer.state_changed') {
			await applyPolarCustomerStateWebhook({
				payload: event,
				providerEventId: webhookId,
			})
		}

		return json({ ok: true }, { status: 202 })
	} catch (cause) {
		if (cause instanceof WebhookVerificationError) {
			throw error(403, 'Invalid Polar webhook signature.')
		}

		throw error(500, cause instanceof Error ? cause.message : 'Polar webhook handling failed.')
	}
}
