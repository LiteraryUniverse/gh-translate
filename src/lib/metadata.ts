import type { MessageTree } from './types'

/** One leaf of a General Translation `<module>.metadata.json` companion file. */
export type KeyMetadata = {
	context?: string
	maxChars?: number
	sourceCode?: Record<string, { before?: string; target?: string; after?: string }[]>
}
export type MetadataTree = { [key: string]: KeyMetadata | MetadataTree }

const isTree = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Flatten a metadata companion by walking the *source* tree's shape — the
 * companion mirrors it, so a metadata leaf sits wherever the source has a
 * string. Keys with literal dots stay intact (same reason as messages.ts).
 */
export const flattenMetadata = (source: MessageTree, meta: unknown, prefix = ''): Record<string, KeyMetadata> => {
	if (!isTree(meta)) return {}
	const out: Record<string, KeyMetadata> = {}
	for (const [key, value] of Object.entries(source)) {
		const path = prefix ? `${prefix}.${key}` : key
		const node = meta[key]
		if (typeof value === 'string') {
			if (isTree(node) && Object.keys(node).length) out[path] = node as KeyMetadata
		} else if (isTree(value)) Object.assign(out, flattenMetadata(value, node, path))
	}
	return out
}
