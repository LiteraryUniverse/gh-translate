import { describe, expect, it } from 'vitest'
import { getArgSpecs, validateTranslation } from './icu'

const plural = 'There {total, plural, zero {are no posts} one {is one post} other {are # posts}} in this blog.'

describe('validateTranslation', () => {
	it('accepts a faithful translation', () => {
		expect(
			validateTranslation({ source: plural, translation: '{total, plural, one {Jeden} other {# příspěvků}}' }),
		).toBeUndefined()
	})
	it('rejects broken ICU syntax', () => {
		expect(validateTranslation({ source: 'Hi {name}', translation: 'Hi {name' })).toMatch(/Invalid ICU/)
	})
	it('rejects dropped top-level placeholders', () => {
		expect(validateTranslation({ source: 'Hi {name}', translation: 'Ahoj' })).toMatch(/Drops placeholder.*name/)
	})
	it('rejects placeholders unknown to the source', () => {
		expect(validateTranslation({ source: 'Hi {name}', translation: 'Ahoj {jmeno}' })).toMatch(/Unknown placeholder.*jmeno/)
	})
	it('allows omitting branch-only placeholders (validateLocale parity)', () => {
		const source = '{total, plural, one {{name} posted once} other {{name} posted # times}}'
		expect(validateTranslation({ source, translation: '{total, plural, other {Příspěvky}}' })).toBeUndefined()
	})
	it('accepts tags used by the source', () => {
		expect(validateTranslation({ source: 'Read <b>{title}</b>', translation: 'Čti <b>{title}</b>' })).toBeUndefined()
	})
	it('is lenient when the source itself is unparseable', () => {
		expect(validateTranslation({ source: 'broken {', translation: 'anything' })).toBeUndefined()
	})
})

describe('getArgSpecs', () => {
	it('detects plural args as numbers with nested text args', () => {
		const specs = getArgSpecs('{total, plural, one {{name} once} other {{name} # times}}')
		expect(specs).toContainEqual({ name: 'total', kind: 'number' })
		expect(specs).toContainEqual({ name: 'name', kind: 'text' })
	})
	it('detects select options', () => {
		const specs = getArgSpecs('{type, select, org {Blog} universe {Universe} other {}} settings')
		expect(specs).toEqual([{ name: 'type', kind: 'select', options: ['org', 'universe', 'other'] }])
	})
	it('returns empty for plain text and for parse errors', () => {
		expect(getArgSpecs('Just text')).toEqual([])
		expect(getArgSpecs('broken {')).toEqual([])
	})
})
