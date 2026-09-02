import { describe, expect, it } from 'vitest'
import { canTranslate } from './roster'

describe('canTranslate', () => {
	it('is open when no roster file exists', () => {
		expect(canTranslate({ roster: null, login: 'anyone', locale: 'cs-CZ' })).toBe(true)
	})
	it('rejects unlisted logins when a roster exists', () => {
		expect(canTranslate({ roster: {}, login: 'anyone', locale: 'cs-CZ' })).toBe(false)
	})
	it('honours per-locale scoping', () => {
		const roster = { jan: ['cs-CZ', 'sk-SK'] }
		expect(canTranslate({ roster, login: 'jan', locale: 'cs-CZ' })).toBe(true)
		expect(canTranslate({ roster, login: 'jan', locale: 'pl-PL' })).toBe(false)
	})
	it('honours the * wildcard', () => {
		expect(canTranslate({ roster: { jan: '*' }, login: 'jan', locale: 'ja-JP' })).toBe(true)
	})
})
