import { rawFileFn } from '~/server/fns'
import type { MessageTree } from './types'

/**
 * Message files are fetched by the browser straight from raw.githubusercontent.com
 * (public repo), sha-addressed so results are exact for the head the server
 * reported — never stale, cacheable forever, and free of Worker subrequest limits.
 * If the browser refuses the request (ad blockers drop names like `cookieconsent.json`,
 * surfacing as a TypeError "Failed to fetch"), the Worker fetches the same file instead.
 */
const readRepoJson = async (repo: string, head: string, path: string): Promise<unknown> => {
	let res: Response
	try {
		res = await fetch(`https://raw.githubusercontent.com/${repo}/${head}/${path}`)
	} catch {
		const text = await rawFileFn({ data: { head, path } })
		return text === null ? null : JSON.parse(text)
	}
	if (res.status === 404) return null
	if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`)
	return res.json()
}

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
}): Promise<MessageTree | null> => readRepoJson(repo, head, `${locale}/${module}.json`) as Promise<MessageTree | null>

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
}): Promise<unknown> =>
	// ponytail: a broken companion is not worth blocking the editor over — treat as absent.
	readRepoJson(repo, head, `${locale}/${module}.metadata.json`).catch(() => null)
