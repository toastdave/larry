import { createPolarCheckoutForPlan, isPaidPlanSlug } from '$lib/server/polar'
import { error, redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals, params, url }) => {
	if (!locals.user) {
		throw redirect(303, '/auth/sign-in?redirectTo=/account#billing')
	}

	if (!isPaidPlanSlug(params.planSlug)) {
		throw error(404, 'Unknown billing plan.')
	}

	let checkoutUrl: string

	try {
		const checkout = await createPolarCheckoutForPlan({
			origin: url.origin,
			planSlug: params.planSlug,
			user: {
				email: locals.user.email,
				id: locals.user.id,
				name: locals.user.name,
			},
		})

		checkoutUrl = checkout.url
	} catch (cause) {
		const message =
			cause instanceof Error ? cause.message : 'Unable to start Polar checkout right now.'

		throw error(503, message)
	}

	throw redirect(303, checkoutUrl)
}
