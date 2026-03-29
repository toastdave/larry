import { loadConversationForUser } from '$lib/server/chat-store'
import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		throw redirect(303, '/auth/sign-in?redirectTo=/chat')
	}

	const conversationSlug = url.searchParams.get('conversation')
	const chatState = await loadConversationForUser(locals.user.id, conversationSlug)

	return {
		activeConversation: chatState.activeConversation,
		conversations: chatState.conversations,
		messages: chatState.messages,
		session: locals.session,
		user: locals.user,
	}
}
