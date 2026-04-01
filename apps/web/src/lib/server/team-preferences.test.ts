import { describe, expect, test } from 'bun:test'
import {
	buildTeamSlug,
	parseTeamPreferenceInput,
	readTeamPreferenceFormValues,
} from './team-preferences'

describe('team preference helpers', () => {
	test('builds stable team slugs', () => {
		expect(buildTeamSlug('NBA', 'New York Knicks')).toBe('nba-new-york-knicks')
	})

	test('reads and trims form values', () => {
		const formData = new FormData()
		formData.set('favoriteLeague', ' NBA ')
		formData.set('favoriteTeam', ' New York Knicks ')
		formData.set('rivalLeague', 'NFL')
		formData.set('rivalTeam', ' Patriots ')

		expect(readTeamPreferenceFormValues(formData)).toEqual({
			favoriteLeague: 'NBA',
			favoriteTeam: 'New York Knicks',
			rivalLeague: 'NFL',
			rivalTeam: 'Patriots',
		})
	})

	test('accepts a valid favorite team preference', () => {
		expect(
			parseTeamPreferenceInput({
				affinity: 'favorite',
				league: 'NBA',
				teamName: 'New York Knicks',
			})
		).toEqual({
			error: null,
			preference: {
				affinity: 'favorite',
				league: 'NBA',
				teamName: 'New York Knicks',
				teamSlug: 'nba-new-york-knicks',
			},
		})
	})

	test('rejects partial form input', () => {
		expect(
			parseTeamPreferenceInput({
				affinity: 'rival',
				league: '',
				teamName: 'Boston Celtics',
			})
		).toEqual({
			error: 'Rival league is required when a team is set.',
			preference: null,
		})
	})
})
