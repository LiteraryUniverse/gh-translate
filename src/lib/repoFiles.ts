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
