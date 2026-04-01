export type MessageCitation = {
	id: string
	label: string
	sourceName: string
	url: string
}

export type CitationTextPart =
	| {
			id: string
			type: 'citation'
			label: string
			number: number
			url: string
	  }
	| {
			id: string
			type: 'text'
			value: string
	  }

const citationReferencePattern = /\[(\d+)\]/g

export function splitMessageForCitations(
	text: string | null | undefined,
	citations: MessageCitation[]
): CitationTextPart[] {
	if (!text) {
		return []
	}

	const parts: CitationTextPart[] = []
	let lastIndex = 0
	let match: RegExpExecArray | null

	for (
		match = citationReferencePattern.exec(text);
		match;
		match = citationReferencePattern.exec(text)
	) {
		const [token, rawIndex] = match
		const tokenIndex = match.index
		const citationIndex = Number(rawIndex) - 1
		const citation = citations[citationIndex]

		if (tokenIndex > lastIndex) {
			parts.push({
				id: `text-${parts.length}`,
				type: 'text',
				value: text.slice(lastIndex, tokenIndex),
			})
		}

		if (citation) {
			parts.push({
				id: citation.id,
				label: citation.label,
				number: citationIndex + 1,
				type: 'citation',
				url: citation.url,
			})
		} else {
			parts.push({
				id: `text-${parts.length}`,
				type: 'text',
				value: token,
			})
		}

		lastIndex = tokenIndex + token.length
	}

	if (lastIndex < text.length) {
		parts.push({
			id: `text-${parts.length}`,
			type: 'text',
			value: text.slice(lastIndex),
		})
	}

	return parts.length > 0 ? parts : [{ id: 'text-0', type: 'text', value: text }]
}

export function formatCitationReferenceLabel(index: number, citation: MessageCitation) {
	return `[${index + 1}] ${citation.label}`
}
