import { describe, expect, test } from 'bun:test'
import {
	parseDisplayNameInput,
	parseProfileImageInput,
	readProfileFormValues,
} from './profile-settings'

describe('profile settings helpers', () => {
	test('reads and trims the display name field', () => {
		const formData = new FormData()
		formData.set('displayName', '  Coach Prime  ')

		expect(readProfileFormValues(formData)).toEqual({
			displayName: 'Coach Prime',
			imageUrl: '',
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
