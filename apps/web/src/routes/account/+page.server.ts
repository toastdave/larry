import { loadBillingSnapshotForUser } from '$lib/server/billing'
import { db } from '$lib/server/db'
import {
	parseTeamPreferenceInput,
	readTeamPreferenceFormValues,
} from '$lib/server/team-preferences'
import { userTeamPreference } from '@larry/db/schema'
import { supportedLeagues } from '@larry/search'
import { fail, redirect } from '@sveltejs/kit'
import { and, eq, inArray } from 'drizzle-orm'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || !locals.session) {
		throw redirect(303, '/auth/sign-in?redirectTo=/account')
	}

	const userId = locals.user.id

	const [billing, teamPreferences] = await Promise.all([
		loadBillingSnapshotForUser(userId),
		db
			.select({
				affinity: userTeamPreference.affinity,
				league: userTeamPreference.league,
				teamName: userTeamPreference.teamName,
			})
			.from(userTeamPreference)
			.where(
				and(
					eq(userTeamPreference.userId, userId),
					inArray(userTeamPreference.affinity, ['favorite', 'rival'])
				)
			),
	])

	const favoriteTeam =
		teamPreferences.find((preference) => preference.affinity === 'favorite') ?? null
	const rivalTeam = teamPreferences.find((preference) => preference.affinity === 'rival') ?? null

	return {
		billing,
		leagueOptions: supportedLeagues,
		preferences: {
			favorite: favoriteTeam,
			rival: rivalTeam,
		},
		session: locals.session,
		user: locals.user,
	}
}

export const actions: Actions = {
	savePreferences: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, {
				message: 'You must be signed in to save team preferences.',
			})
		}

		const userId = locals.user.id

		const values = readTeamPreferenceFormValues(await request.formData())
		const favoriteResult = parseTeamPreferenceInput({
			affinity: 'favorite',
			league: values.favoriteLeague,
			teamName: values.favoriteTeam,
		})
		const rivalResult = parseTeamPreferenceInput({
			affinity: 'rival',
			league: values.rivalLeague,
			teamName: values.rivalTeam,
		})

		if (favoriteResult.error || rivalResult.error) {
			return fail(400, {
				fieldErrors: {
					favorite: favoriteResult.error,
					rival: rivalResult.error,
				},
				message: 'Fix the team settings and try again.',
				values,
			})
		}

		await db.transaction(async (tx) => {
			await tx
				.delete(userTeamPreference)
				.where(
					and(
						eq(userTeamPreference.userId, userId),
						inArray(userTeamPreference.affinity, ['favorite', 'rival'])
					)
				)

			const preferences = [favoriteResult.preference, rivalResult.preference].flatMap(
				(preference) => (preference ? [preference] : [])
			)

			if (preferences.length > 0) {
				await tx.insert(userTeamPreference).values(
					preferences.map((preference) => ({
						affinity: preference.affinity,
						league: preference.league,
						teamName: preference.teamName,
						teamSlug: preference.teamSlug,
						userId,
					}))
				)
			}
		})

		return {
			message: 'Team preferences updated. Larry now knows who you love and who you love to hate.',
			values,
		}
	},
}
