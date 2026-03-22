import { describe, expect, test } from 'bun:test'
import { formatCitationLabel, inferLeague, requiresFreshSearch } from './index'

describe('search package', () => {
	test('detects fresh search intent', () => {
		expect(requiresFreshSearch('What are the latest NBA standings today?')).toBe(true)
		expect(requiresFreshSearch('Tell me why the triangle offense is dead')).toBe(false)
	})

	test('infers leagues and formats citations', () => {
		expect(inferLeague('Give me the latest on the NFL playoff picture')).toBe('NFL')
		expect(
			formatCitationLabel({
				publishedAt: '2026-03-22T10:00:00.000Z',
				sourceName: 'ESPN',
			})
		).toContain('ESPN')
	})
})
