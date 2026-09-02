import type { FlatMessages, MessageTree } from './types'

const isTree = (value: string | MessageTree): value is MessageTree =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

/** Same flattening as intl-web's validateLocale.mjs — nested objects become dot-paths. */
export const flattenMessages = (tree: MessageTree, prefix = ''): FlatMessages =>
	Object.entries(tree).reduce<FlatMessages>((acc, [key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key
		if (isTree(value)) Object.assign(acc, flattenMessages(value, path))
		else if (typeof value === 'string') acc[path] = value
		return acc
	}, {})

/** True when every leaf is a string — i.e. the file round-trips through flatten/merge. */
export const isEditableTree = (tree: unknown): tree is MessageTree => {
	if (typeof tree !== 'object' || tree === null || Array.isArray(tree)) return false
	return Object.values(tree).every((value) => typeof value === 'string' || isEditableTree(value))
}

// Flat keys may contain literal dots ("a11y.navigation"), so a flattened key can
// never be naively unflattened — we locate it by walking the tree's actual shape.
const findLeaf = (tree: MessageTree, flatKey: string): { parent: MessageTree; key: string } | undefined => {
	if (typeof tree[flatKey] === 'string') return { parent: tree, key: flatKey }
	for (const [key, value] of Object.entries(tree)) {
		if (isTree(value) && flatKey.startsWith(`${key}.`)) {
			const found = findLeaf(value, flatKey.slice(key.length + 1))
			if (found) return found
		}
	}
	return undefined
}

/** Insert a new key into `target`, nesting the way the source-locale tree shapes it. */
const insertShaped = (target: MessageTree, shape: MessageTree | undefined, flatKey: string, value: string): void => {
	if (shape) {
		for (const [key, shapeValue] of Object.entries(shape)) {
			if (isTree(shapeValue) && flatKey.startsWith(`${key}.`)) {
				const existing = target[key]
				const child = isTree(existing) ? existing : (target[key] = {})
				insertShaped(child, shapeValue, flatKey.slice(key.length + 1), value)
				return
			}
		}
	}
	target[flatKey] = value
}

const pruneEmpty = (tree: MessageTree): void => {
	for (const [key, value] of Object.entries(tree)) {
		if (isTree(value)) {
			pruneEmpty(value)
			if (Object.keys(value).length === 0) delete tree[key]
		}
	}
}

export type MergeResult = { tree: MessageTree; changed: string[] }

/**
 * Apply drafts (flat keys) onto the live tree. Existing keys update in place
 * (order preserved); new keys nest following the source tree's shape; empty
 * drafts delete the key (back to untranslated). Keys the drafts don't touch
 * are never modified — this is what makes saving onto a moved head safe.
 */
export const mergeDrafts = ({
	live,
	source,
	drafts,
}: {
	live: MessageTree
	source: MessageTree
	drafts: FlatMessages
}): MergeResult => {
	const tree = structuredClone(live)
	const changed: string[] = []
	for (const [flatKey, draft] of Object.entries(drafts)) {
		const leaf = findLeaf(tree, flatKey)
		if (draft.trim() === '') {
			if (leaf) {
				delete leaf.parent[leaf.key]
				changed.push(flatKey)
			}
		} else if (leaf) {
			if (leaf.parent[leaf.key] !== draft) {
				leaf.parent[leaf.key] = draft
				changed.push(flatKey)
			}
		} else {
			insertShaped(tree, source, flatKey, draft)
			changed.push(flatKey)
		}
	}
	pruneEmpty(tree)
	return { tree, changed }
}

/** Matches intl-web file formatting (2-space indent, trailing newline) for clean diffs. */
export const stringifyMessages = (tree: MessageTree): string => `${JSON.stringify(tree, null, 2)}\n`
