import { describe, expect, test } from 'bun:test'
import { formatCitationReferenceLabel, splitMessageForCitations } from './citation-text'

describe('citation text helpers', () => {
	test('splits inline citation markers into linked parts', () => {
		const parts = splitMessageForCitations('Boston closed strong [1] and the race tightened [2].', [
			{
				id: 'citation-1',
				label: 'ESPN - 3/29/2026',
				sourceName: 'ESPN',
				url: 'https://www.espn.com/1',
			},
			{
				id: 'citation-2',
				label: 'The Athletic - 3/29/2026',
				sourceName: 'The Athletic',
				url: 'https://www.nytimes.com/athletic/2',
			},
		])

		expect(parts).toEqual([
			{ id: 'text-0', type: 'text', value: 'Boston closed strong ' },
			{
				id: 'citation-1',
				label: 'ESPN - 3/29/2026',
				number: 1,
				type: 'citation',
				url: 'https://www.espn.com/1',
			},
			{ id: 'text-2', type: 'text', value: ' and the race tightened ' },
			{
				id: 'citation-2',
				label: 'The Athletic - 3/29/2026',
				number: 2,
				type: 'citation',
				url: 'https://www.nytimes.com/athletic/2',
			},
			{ id: 'text-4', type: 'text', value: '.' },
		])
	})

	test('leaves unknown citation markers as plain text', () => {
		const parts = splitMessageForCitations('This one stays raw [3].', [])

		expect(parts).toEqual([
			{ id: 'text-0', type: 'text', value: 'This one stays raw ' },
			{ id: 'text-1', type: 'text', value: '[3]' },
			{ id: 'text-2', type: 'text', value: '.' },
		])
	})

	test('formats citation list labels with numbers', () => {
		expect(
			formatCitationReferenceLabel(0, {
				id: 'citation-1',
				label: 'ESPN - 3/29/2026',
				sourceName: 'ESPN',
				url: 'https://www.espn.com/1',
			})
		).toBe('[1] ESPN - 3/29/2026')
	})
})
