import type { MessageTree } from './types'

/**
 * Message files are fetched by the browser straight from raw.githubusercontent.com
 * (public repo), sha-addressed so results are exact for the head the server
 * reported — never stale, cacheable forever, and free of Worker subrequest limits.
 */
export const fetchModuleTree = async ({
	repo,
	head,
	locale,
	module,
}: {
	repo: string
	head: string
	locale: string
	module: string
}): Promise<MessageTree | null> => {
	const res = await fetch(`https://raw.githubusercontent.com/${repo}/${head}/${locale}/${module}.json`)
	if (res.status === 404) return null
	if (!res.ok) throw new Error(`${locale}/${module}.json → HTTP ${res.status}`)
	return res.json() as Promise<MessageTree>
}

/** General Translation keyed-metadata companion (`<module>.metadata.json`) next to the source file, if any. */
export const fetchModuleMetadata = async ({
	repo,
	head,
	locale,
	module,
}: {
	repo: string
	head: string
	locale: string
	module: string
}): Promise<unknown> => {
	const res = await fetch(`https://raw.githubusercontent.com/${repo}/${head}/${locale}/${module}.metadata.json`)
	// ponytail: a broken companion is not worth blocking the editor over — treat as absent.
	return res.ok ? res.json().catch(() => null) : null
}
