import { loadBillingSnapshotForUser, loadPublicBillingSnapshot } from '$lib/server/billing'
import { loadConversationForUser } from '$lib/server/chat-store'
import { getCheckoutPathForPlan } from '$lib/server/polar'
import { getPersonaBySlug } from '@larry/ai'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	const conversationSlug = url.searchParams.get('conversation')
	const initialPersonaSlug = getPersonaBySlug(url.searchParams.get('persona')).slug
	const initialDraft = url.searchParams.get('prompt')?.trim() ?? ''

	if (!locals.user || !locals.session) {
		const billing = await loadPublicBillingSnapshot()

		return {
			activeConversation: null,
			billing,
			billingUpgradePath: billing.nextPlan ? getCheckoutPathForPlan(billing.nextPlan.slug) : null,
			conversations: [],
			initialDraft,
			initialPersonaSlug,
			messages: [],
			session: null,
			user: null,
		}
	}

	const [billing, chatState] = await Promise.all([
		loadBillingSnapshotForUser(locals.user.id),
		loadConversationForUser(locals.user.id, conversationSlug, {
			emptyState: url.searchParams.get('new') === '1',
		}),
	])

	return {
		activeConversation: chatState.activeConversation,
		billing,
		billingUpgradePath: billing.nextPlan ? getCheckoutPathForPlan(billing.nextPlan.slug) : null,
		conversations: chatState.conversations,
		initialDraft,
		initialPersonaSlug,
		messages: chatState.messages,
		session: locals.session,
		user: locals.user,
	}
}
