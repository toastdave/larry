import { describe, expect, test } from 'bun:test'
import { conversation, message, plan, user } from './index'

describe('schema exports', () => {
	test('core tables exist', () => {
		expect(user).toBeDefined()
		expect(conversation).toBeDefined()
		expect(message).toBeDefined()
		expect(plan).toBeDefined()
	})
})
