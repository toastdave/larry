import { loadBillingSnapshotForUser } from '$lib/server/billing'
import { db } from '$lib/server/db'
import {
	getAvailableCheckoutPaths,
	isPolarCheckoutEnabled,
	syncPolarCheckoutForUser,
} from '$lib/server/polar'
import { parseDisplayNameInput, readProfileFormValues } from '$lib/server/profile-settings'
import {
	parseTeamPreferenceInput,
	readTeamPreferenceFormValues,
} from '$lib/server/team-preferences'
import { user, userTeamPreference } from '@larry/db/schema'
import { supportedLeagues } from '@larry/search'
import { fail, redirect } from '@sveltejs/kit'
import { and, eq, inArray } from 'drizzle-orm'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals, url }) => {
	if (!locals.user || !locals.session) {
		throw redirect(303, '/auth/sign-in?redirectTo=/account')
	}

	const userId = locals.user.id
	let checkoutNotice: { message: string; tone: 'error' | 'success' | 'warning' } | null = null

	if (url.searchParams.get('checkout') === 'success') {
		const checkoutId = url.searchParams.get('checkout_id')

		if (!checkoutId) {
			checkoutNotice = {
				message: 'Polar redirected back, but the checkout session ID was missing.',
				tone: 'warning',
			}
		} else {
			try {
				const checkout = await syncPolarCheckoutForUser({ checkoutId, userId })

				checkoutNotice =
					checkout.status === 'succeeded'
						? {
								message:
									'Sandbox checkout succeeded and your entitlement snapshot has been synced.',
								tone: 'success',
							}
						: {
								message: `Sandbox checkout returned with status ${checkout.status}. If Polar is still finishing the order, refresh in a moment.`,
								tone: 'warning',
							}
			} catch (error) {
				checkoutNotice = {
					message:
						error instanceof Error
							? error.message
							: 'Unable to sync the Polar checkout return yet.',
					tone: 'error',
				}
			}
		}
	}

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
		checkoutLinks: getAvailableCheckoutPaths(),
		checkoutNotice,
		leagueOptions: supportedLeagues,
		polarCheckoutEnabled: isPolarCheckoutEnabled(),
		preferences: {
			favorite: favoriteTeam,
			rival: rivalTeam,
		},
		session: locals.session,
		user: locals.user,
	}
}

export const actions: Actions = {
	saveProfile: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, {
				profile: {
					message: 'You must be signed in to update your profile.',
					values: {
						displayName: '',
					},
				},
			})
		}

		const values = readProfileFormValues(await request.formData())
		const displayNameResult = parseDisplayNameInput(values.displayName)

		if (displayNameResult.error) {
			return fail(400, {
				profile: {
					fieldErrors: {
						displayName: displayNameResult.error,
					},
					message: 'Fix the profile settings and try again.',
					values,
				},
			})
		}

		const nextDisplayName = displayNameResult.value

		if (!nextDisplayName) {
			return fail(400, {
				profile: {
					fieldErrors: {
						displayName: 'Display name is required.',
					},
					message: 'Fix the profile settings and try again.',
					values,
				},
			})
		}

		await db
			.update(user)
			.set({
				name: nextDisplayName,
				updatedAt: new Date(),
			})
			.where(eq(user.id, locals.user.id))

		return {
			profile: {
				message: 'Profile updated. Larry will use the new display name on the next request.',
				values,
			},
		}
	},
	savePreferences: async ({ locals, request }) => {
		if (!locals.user) {
			return fail(401, {
				preferences: {
					message: 'You must be signed in to save team preferences.',
					values: {
						favoriteLeague: '',
						favoriteTeam: '',
						rivalLeague: '',
						rivalTeam: '',
					},
				},
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
				preferences: {
					fieldErrors: {
						favorite: favoriteResult.error,
						rival: rivalResult.error,
					},
					message: 'Fix the team settings and try again.',
					values,
				},
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
			preferences: {
				message: 'Team preferences updated. Larry now knows who you love and who you love to hate.',
				values,
			},
		}
	},
}
