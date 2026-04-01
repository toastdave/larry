import { type SupportedLeague, supportedLeagues } from '@larry/search'

export type TeamAffinity = 'favorite' | 'rival'

export type TeamPreferenceInput = {
	affinity: TeamAffinity
	league: SupportedLeague
	teamName: string
	teamSlug: string
}

export type TeamPreferenceFormValues = {
	favoriteLeague: string
	favoriteTeam: string
	rivalLeague: string
	rivalTeam: string
}

function normalizeWhitespace(value: string | null | undefined) {
	return (value ?? '').replace(/\s+/g, ' ').trim()
}

function isSupportedLeague(value: string): value is SupportedLeague {
	return supportedLeagues.includes(value as SupportedLeague)
}

export function buildTeamSlug(league: SupportedLeague, teamName: string) {
	const normalizedTeamName = normalizeWhitespace(teamName)
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')

	return `${league.toLowerCase()}-${normalizedTeamName}`
}

export function readTeamPreferenceFormValues(formData: FormData): TeamPreferenceFormValues {
	return {
		favoriteLeague: normalizeWhitespace(formData.get('favoriteLeague')?.toString()),
		favoriteTeam: normalizeWhitespace(formData.get('favoriteTeam')?.toString()),
		rivalLeague: normalizeWhitespace(formData.get('rivalLeague')?.toString()),
		rivalTeam: normalizeWhitespace(formData.get('rivalTeam')?.toString()),
	}
}

export function parseTeamPreferenceInput(input: {
	affinity: TeamAffinity
	league: string
	teamName: string
}) {
	const league = normalizeWhitespace(input.league)
	const teamName = normalizeWhitespace(input.teamName)

	if (!league && !teamName) {
		return {
			preference: null,
			error: null,
		} as const
	}

	if (!league) {
		return {
			preference: null,
			error: `${input.affinity === 'favorite' ? 'Favorite' : 'Rival'} league is required when a team is set.`,
		} as const
	}

	if (!teamName) {
		return {
			preference: null,
			error: `${input.affinity === 'favorite' ? 'Favorite' : 'Rival'} team is required when a league is set.`,
		} as const
	}

	if (!isSupportedLeague(league)) {
		return {
			preference: null,
			error: `Unsupported ${input.affinity} league.`,
		} as const
	}

	if (teamName.length < 2 || teamName.length > 120) {
		return {
			preference: null,
			error: `${input.affinity === 'favorite' ? 'Favorite' : 'Rival'} team must be between 2 and 120 characters.`,
		} as const
	}

	return {
		preference: {
			affinity: input.affinity,
			league,
			teamName,
			teamSlug: buildTeamSlug(league, teamName),
		},
		error: null,
	} as const
}
