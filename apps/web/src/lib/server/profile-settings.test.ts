import { describe, expect, test } from 'bun:test'
import { parseDisplayNameInput, readProfileFormValues } from './profile-settings'

describe('profile settings helpers', () => {
	test('reads and trims the display name field', () => {
		const formData = new FormData()
		formData.set('displayName', '  Coach Prime  ')

		expect(readProfileFormValues(formData)).toEqual({
			displayName: 'Coach Prime',
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
})
