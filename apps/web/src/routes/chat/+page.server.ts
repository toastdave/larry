import { loadBillingSnapshotForUser } from '$lib/server/billing'
import { loadConversationForUser } from '$lib/server/chat-store'
import { getPersonaBySlug } from '@larry/ai'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		throw redirect(303, '/auth/sign-in?redirectTo=/chat')
	}

	const conversationSlug = url.searchParams.get('conversation')
	const initialPersonaSlug = getPersonaBySlug(url.searchParams.get('persona')).slug
	const [billing, chatState] = await Promise.all([
		loadBillingSnapshotForUser(locals.user.id),
		loadConversationForUser(locals.user.id, conversationSlug, {
			emptyState: url.searchParams.get('new') === '1',
		}),
	])

	return {
		activeConversation: chatState.activeConversation,
		billing,
		conversations: chatState.conversations,
		initialPersonaSlug,
		messages: chatState.messages,
		session: locals.session,
		user: locals.user,
	}
}
