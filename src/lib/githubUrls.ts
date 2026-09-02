const GITHUB = 'https://github.com'

export const repoUrl = (repo: string): string => `${GITHUB}/${repo}`

export const commitUrl = (repo: string, sha: string): string => `${GITHUB}/${repo}/commit/${sha}`

export const blobUrl = (repo: string, ref: string, path: string): string =>
	`${GITHUB}/${repo}/blob/${ref}/${path}`

/** Home views at `/wiki`; named pages at `/wiki/<page>`. */
export const wikiPageUrl = (repo: string, page?: string): string =>
	!page || page === 'Home' ? `${GITHUB}/${repo}/wiki` : `${GITHUB}/${repo}/wiki/${page}`

export const wikiEditUrl = (repo: string, page: string): string => `${GITHUB}/${repo}/wiki/${page}/_edit`
