import { type SportsPersonaSlug, getPersonaBySlug } from '@larry/ai'
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
	personaSlug?: SportsPersonaSlug | string | null
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

export function buildLocalReply({
	favoriteTeam,
	historyCount = 0,
	personaSlug,
	prompt,
}: ReplyOptions) {
	const league = inferLeague(prompt) ?? 'NFL'
	const needsFreshSearch = requiresFreshSearch(prompt)
	const leagueTake = leagueTakes[league] ?? leagueTakes.NFL
	const persona = getPersonaBySlug(personaSlug)
	const fandomNudge = favoriteTeam
		? `And because you ride with ${favoriteTeam}, I know exactly which emotional scars to poke.`
		: 'I can already hear the barstool outrage from here.'
	const personaFallbackLine =
		persona.slug === 'scout'
			? 'Let me give you the clean version: isolate the trend, pressure-test the sample, and do not confuse a heater with a real shift.'
			: persona.slug === 'vega'
				? 'The useful move is to stay honest about the board, the timing, and what we still do not know.'
				: 'So yes, I still have a take even when the live wires are acting up.'

	if (needsFreshSearch) {
		const searchFallbackLead =
			persona.slug === 'scout'
				? 'This is the kind of question where I want the latest numbers before I publish the scouting report.'
				: persona.slug === 'vega'
					? 'This one lives or dies on current odds, injury context, and timing, so I am not going to fake a stale board.'
					: 'All right, this is the kind of question where I should be checking live scores, odds, or injury wires before I pound the table.'

		return [
			`${searchFallbackLead} Live search is unavailable right now, so I am not going to fake fresh facts.`,
			`${leagueTake} ${personaFallbackLine} ${fandomNudge}`,
		].join(' ')
	}

	if (historyCount > 2) {
		const verdictLine =
			persona.slug === 'scout'
				? 'If you want the Scout verdict: the take only holds if the numbers, matchup context, and late-game indicators survive scrutiny.'
				: persona.slug === 'vega'
					? 'If you want the Vega read: respect the matchup, the injury board, and any signal that the market is telling you something before you chase a number.'
					: 'So if you want the Larry verdict: the team or take you asked about better have a real star, a real coach, and real late-game nerve or I am calling them fugazi with my full chest.'

		return [
			'We are deep in the argument now, and I respect the commitment.',
			`${leagueTake} ${verdictLine}`,
		].join(' ')
	}

	const openingLine =
		persona.slug === 'scout'
			? 'Here is the opening read:'
			: persona.slug === 'vega'
				? 'Here is the first market read:'
				: "Here's my opening take:"

	const closerLine =
		persona.slug === 'scout'
			? 'If you want the clean answer, I need to know which indicators are holding up against real competition and which ones are just dressed-up noise.'
			: persona.slug === 'vega'
				? 'If you want the honest odds angle, I need to know what the latest board says, what could move it, and whether the market is reacting to anything real.'
				: 'If you want the polite answer, ask a spreadsheet. If you want the bar answer, I need to know who can actually handle pressure, who is living off brand reputation, and who folds the second the lights get hot.'

	return [`${openingLine} ${leagueTake}`, `${closerLine} ${fandomNudge}`].join(' ')
}
