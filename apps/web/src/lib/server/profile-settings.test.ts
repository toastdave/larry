import { describe, expect, test } from 'bun:test'
import {
	parseDisplayNameInput,
	parseFanBioInput,
	parseFavoriteSportsMomentInput,
	parseLocationInput,
	parseProfileImageInput,
	readProfileFormValues,
} from './profile-settings'

describe('profile settings helpers', () => {
	test('reads and trims the display name field', () => {
		const formData = new FormData()
		formData.set('displayName', '  Coach Prime  ')
		formData.set('location', '  Queens, NY  ')
		formData.set('fanBio', '  Defense-first Knicks sicko.  ')
		formData.set('favoriteSportsMoment', '  The 2016 Villanova title buzzer beater.  ')

		expect(readProfileFormValues(formData)).toEqual({
			displayName: 'Coach Prime',
			fanBio: 'Defense-first Knicks sicko.',
			favoriteSportsMoment: 'The 2016 Villanova title buzzer beater.',
			imageUrl: '',
			location: 'Queens, NY',
		})
	})

	test('rejects display names that are too short', () => {
		expect(parseDisplayNameInput('L')).toEqual({
			error: 'Use at least 2 characters so Larry has something to call you.',
			value: null,
		})
	})

	test('accepts valid display names', () => {
		expect(parseDisplayNameInput('Larry Legend')).toEqual({
			error: null,
			value: 'Larry Legend',
		})
	})

	test('accepts a blank location', () => {
		expect(parseLocationInput('')).toEqual({
			error: null,
			value: null,
		})
	})

	test('rejects a location that is too short', () => {
		expect(parseLocationInput('Q')).toEqual({
			error: 'Location should be at least 2 characters or left blank.',
			value: null,
		})
	})

	test('accepts a valid fan bio', () => {
		expect(parseFanBioInput('Film-room addict who trusts ugly wins.')).toEqual({
			error: null,
			value: 'Film-room addict who trusts ugly wins.',
		})
	})

	test('rejects a fan bio that is too short', () => {
		expect(parseFanBioInput('short')).toEqual({
			error: 'Fan bio should be at least 8 characters or left blank.',
			value: null,
		})
	})

	test('accepts a favorite sports moment', () => {
		expect(parseFavoriteSportsMomentInput('The 2004 Red Sox comeback still owns me.')).toEqual({
			error: null,
			value: 'The 2004 Red Sox comeback still owns me.',
		})
	})

	test('rejects a favorite sports moment that is too short', () => {
		expect(parseFavoriteSportsMomentInput('Great game')).toEqual({
			error: 'Favorite sports moment should be at least 12 characters or left blank.',
			value: null,
		})
	})

	test('allows an empty profile image', () => {
		expect(parseProfileImageInput('')).toEqual({
			error: null,
			value: null,
		})
	})

	test('rejects invalid profile image URLs', () => {
		expect(parseProfileImageInput('larry-face')).toEqual({
			error: 'Use a valid image URL or leave it blank.',
			value: null,
		})
	})

	test('accepts http and https profile image URLs', () => {
		expect(parseProfileImageInput('https://example.com/avatar.png')).toEqual({
			error: null,
			value: 'https://example.com/avatar.png',
		})
	})
})
