import { createSystemPrompt } from '@larry/ai'
import { inferLeague, requiresFreshSearch } from '@larry/search'

const leagueTakes: Record<string, string> = {
	MLB: 'Baseball lies to everybody for two months, so I trust process more than April win streaks.',
	NBA: 'In the NBA, top-end shot creation and not melting in crunch time still separate contenders from cosplay contenders.',
	NCAAB:
		'College hoops is chaos in a warm-up jacket, so guard play and late-game composure matter more than the shiny ranking beside the logo.',
	NCAAF:
		'College football turns one bad Saturday into a town-wide identity crisis, so depth and quarterback play are still the real truth serum.',
	NFL: 'In the NFL, quarterback answers everything until the pass rush ruins the answer sheet.',
}

type ReplyOptions = {
	favoriteTeam?: string | null
	historyCount?: number
	prompt: string
}

function normalizeWhitespace(value: string) {
	return value.replace(/\s+/g, ' ').trim()
}

export function buildConversationTitle(prompt: string) {
	const normalized = normalizeWhitespace(prompt)

	if (!normalized) {
		return 'New Debate'
	}

	if (normalized.length <= 64) {
		return normalized
	}

	const words = normalized.split(' ').slice(0, 8).join(' ')
	return `${words}...`
}

export function buildConversationSlug(prompt: string) {
	const title = buildConversationTitle(prompt)
	const base = title
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.trim()
		.replace(/\s+/g, '-')
		.slice(0, 48)

	const suffix = crypto.randomUUID().slice(0, 8)

	return `${base || 'new-debate'}-${suffix}`
}

export function chunkTextForStreaming(text: string) {
	const words = text.split(/\s+/).filter(Boolean)
	const chunks: string[] = []

	for (let index = 0; index < words.length; index += 4) {
		chunks.push(`${words.slice(index, index + 4).join(' ')} `)
	}

	return chunks.length > 0 ? chunks : [text]
}

export function buildLocalReply({ favoriteTeam, historyCount = 0, prompt }: ReplyOptions) {
	const league = inferLeague(prompt) ?? 'NFL'
	const needsFreshSearch = requiresFreshSearch(prompt)
	const leagueTake = leagueTakes[league] ?? leagueTakes.NFL
	const fandomNudge = favoriteTeam
		? `And because you ride with ${favoriteTeam}, I know exactly which emotional scars to poke.`
		: 'I can already hear the barstool outrage from here.'

	const systemPrompt = createSystemPrompt({ favoriteTeam })
	void systemPrompt

	if (needsFreshSearch) {
		return [
			'All right, this is the kind of question where I should be checking live scores, odds, or injury wires before I pound the table. That live tool loop is not wired in this build yet, so I am not going to fake fresh facts.',
			`${leagueTake} My honest fan read is this: ${fandomNudge}`,
		].join(' ')
	}

	if (historyCount > 2) {
		return [
			'We are deep in the argument now, and I respect the commitment.',
			`${leagueTake} So if you want the Larry verdict: the team or take you asked about better have a real star, a real coach, and real late-game nerve or I am calling them fugazi with my full chest.`,
		].join(' ')
	}

	return [
		`Here's my opening take: ${leagueTake}`,
		`If you want the polite answer, ask a spreadsheet. If you want the bar answer, I need to know who can actually handle pressure, who is living off brand reputation, and who folds the second the lights get hot. ${fandomNudge}`,
	].join(' ')
}
