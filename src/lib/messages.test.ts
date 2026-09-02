import { describe, expect, it } from 'vitest'
import { flattenMessages, isEditableTree, mergeDrafts, stringifyMessages } from './messages'

const source = {
	'a11y.navigation': 'Navigation',
	greeting: 'Hello',
	nested: { deep: { leaf: 'Leaf' }, other: 'Other' },
}

describe('flattenMessages', () => {
	it('flattens nested trees to dot paths, keeps literal-dot flat keys', () => {
		expect(flattenMessages(source)).toEqual({
			'a11y.navigation': 'Navigation',
			greeting: 'Hello',
			'nested.deep.leaf': 'Leaf',
			'nested.other': 'Other',
		})
	})
})

describe('isEditableTree', () => {
	it('accepts pure string leaves', () => {
		expect(isEditableTree(source)).toBe(true)
	})
	it('rejects arrays (cookieconsent.json shape)', () => {
		expect(isEditableTree({ modal: { sections: [{ title: 'x' }] } })).toBe(false)
	})
})

describe('mergeDrafts', () => {
	it('updates a literal-dot flat key without unflattening it', () => {
		const { tree, changed } = mergeDrafts({
			live: { 'a11y.navigation': 'Navigace' },
			source,
			drafts: { 'a11y.navigation': 'Navigace!' },
		})
		expect(tree).toEqual({ 'a11y.navigation': 'Navigace!' })
		expect(changed).toEqual(['a11y.navigation'])
	})
	it('updates nested keys in place', () => {
		const live = { nested: { deep: { leaf: 'List' }, other: 'Jiné' } }
		const { tree } = mergeDrafts({ live, source, drafts: { 'nested.deep.leaf': 'Lístek' } })
		expect(tree).toEqual({ nested: { deep: { leaf: 'Lístek' }, other: 'Jiné' } })
	})
	it('inserts new keys following the source shape', () => {
		const { tree } = mergeDrafts({ live: {}, source, drafts: { 'nested.deep.leaf': 'Lístek' } })
		expect(tree).toEqual({ nested: { deep: { leaf: 'Lístek' } } })
	})
	it('never touches keys outside the drafts (stale-head safety)', () => {
		const live = { greeting: 'Ahoj', untouched: 'Zůstává' }
		const { tree, changed } = mergeDrafts({ live, source, drafts: { greeting: 'Nazdar' } })
		expect(tree.untouched).toBe('Zůstává')
		expect(changed).toEqual(['greeting'])
	})
	it('deletes a key on empty draft and prunes empty parents', () => {
		const live = { nested: { deep: { leaf: 'List' } } }
		const { tree, changed } = mergeDrafts({ live, source, drafts: { 'nested.deep.leaf': ' ' } })
		expect(tree).toEqual({})
		expect(changed).toEqual(['nested.deep.leaf'])
	})
	it('reports no change for identical drafts and missing-key deletions', () => {
		const { changed } = mergeDrafts({ live: { greeting: 'Ahoj' }, source, drafts: { greeting: 'Ahoj', gone: '' } })
		expect(changed).toEqual([])
	})
	it('preserves key order of the live file', () => {
		const live = { b: 'B', a: 'A' }
		const { tree } = mergeDrafts({ live, source: { b: 'x', a: 'y' }, drafts: { a: 'A2' } })
		expect(Object.keys(tree)).toEqual(['b', 'a'])
	})
})

describe('stringifyMessages', () => {
	it('formats like the repo files: 2-space indent + trailing newline', () => {
		expect(stringifyMessages({ a: 'b' })).toBe('{\n  "a": "b"\n}\n')
	})
})
