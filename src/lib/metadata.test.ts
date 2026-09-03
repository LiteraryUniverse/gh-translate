import { describe, expect, it } from 'vitest'
import { flattenMetadata } from './metadata'

describe('flattenMetadata', () => {
	it('mirrors the source shape and skips keys without metadata', () => {
		const source = { nav: { home: 'Home', bank: 'Bank' }, 'a11y.label': 'Label' }
		const meta = {
			nav: { bank: { context: 'Riverbank', maxChars: 12 } },
			'a11y.label': { context: 'Screen reader' },
			extra: { context: 'not in source' },
		}
		expect(flattenMetadata(source, meta)).toEqual({
			'nav.bank': { context: 'Riverbank', maxChars: 12 },
			'a11y.label': { context: 'Screen reader' },
		})
	})
	it('tolerates missing or malformed companions', () => {
		expect(flattenMetadata({ a: 'x' }, null)).toEqual({})
		expect(flattenMetadata({ a: 'x' }, { a: 'oops' })).toEqual({})
	})
})
