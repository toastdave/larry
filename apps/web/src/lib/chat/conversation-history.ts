type ConversationLike = {
	personaSlug: string
	title: string
}

function normalizeSearchTerm(value: string) {
	return value.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function filterConversations<T extends ConversationLike>(
	conversations: T[],
	options?: {
		personaSlug?: string | null
		search?: string | null
	}
) {
	const search = normalizeSearchTerm(options?.search ?? '')
	const personaSlug = options?.personaSlug?.trim() ?? ''

	return conversations.filter((conversation) => {
		if (personaSlug && conversation.personaSlug !== personaSlug) {
			return false
		}

		if (!search) {
			return true
		}

		return normalizeSearchTerm(conversation.title).includes(search)
	})
}

export function summarizeConversationFilters(input: {
	personaName?: string | null
	resultCount: number
	search?: string | null
}) {
	const search = normalizeSearchTerm(input.search ?? '')
	const baseLabel = input.resultCount === 1 ? '1 debate' : `${input.resultCount} debates`

	if (search && input.personaName) {
		return `${baseLabel} for ${input.personaName} matching "${search}"`
	}

	if (search) {
		return `${baseLabel} matching "${search}"`
	}

	if (input.personaName) {
		return `${baseLabel} for ${input.personaName}`
	}

	return baseLabel
}
