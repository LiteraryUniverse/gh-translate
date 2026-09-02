import { env } from './env'

const API = 'https://api.github.com'
const UA = 'formatted-translator'

const b64url = (bytes: Uint8Array): string =>
	btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const b64urlJson = (value: unknown): string => b64url(new TextEncoder().encode(JSON.stringify(value)))

const pemToDer = (pem: string): Uint8Array<ArrayBuffer> => {
	const body = atob(pem.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, ''))
	const bytes = new Uint8Array(body.length)
	for (let i = 0; i < body.length; i++) bytes[i] = body.charCodeAt(i)
	return bytes
}

const appJwt = async (): Promise<string> => {
	const now = Math.floor(Date.now() / 1000)
	const header = b64urlJson({ alg: 'RS256', typ: 'JWT' })
	const payload = b64urlJson({ iat: now - 60, exp: now + 540, iss: env.GITHUB_APP_ID })
	// GitHub downloads PKCS1 keys; WebCrypto only imports PKCS8 — see README setup.
	const key = await crypto.subtle.importKey(
		'pkcs8',
		pemToDer(env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, '\n')),
		{ name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
		false,
		['sign'],
	)
	const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${payload}`))
	return `${header}.${payload}.${b64url(new Uint8Array(signature))}`
}

export const ghFetch = async (path: string, token: string | null, init: RequestInit = {}): Promise<Response> =>
	fetch(path.startsWith('https://') ? path : `${API}${path}`, {
		...init,
		headers: {
			Accept: 'application/vnd.github+json',
			...(token ? { Authorization: `Bearer ${token}` } : {}),
			'User-Agent': UA,
			...init.headers,
		},
	})

export const ghJson = async <T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> => {
	const res = await ghFetch(path, token, init)
	if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`)
	return res.json() as Promise<T>
}

let cachedInstallation: { token: string; expiresAt: number } | null = null

export const installationToken = async (): Promise<string> => {
	if (cachedInstallation && Date.now() < cachedInstallation.expiresAt - 120_000) return cachedInstallation.token
	const jwt = await appJwt()
	const owner = env.GITHUB_REPO.split('/')[0].toLowerCase()
	const installations = await ghJson<Array<{ id: number; account: { login: string } | null }>>('/app/installations', jwt)
	const installation = installations.find((i) => i.account?.login.toLowerCase() === owner)
	if (!installation) throw new Error(`GitHub App is not installed on ${owner}`)
	const created = await ghJson<{ token: string; expires_at: string }>(
		`/app/installations/${installation.id}/access_tokens`,
		jwt,
		{ method: 'POST' },
	)
	cachedInstallation = { token: created.token, expiresAt: Date.parse(created.expires_at) }
	return created.token
}

/**
 * Reads work without the GitHub App too (public repo, unauthenticated rate
 * limits apply) so local dev and read-only browsing need no credentials.
 */
export const installationTokenOrNull = async (): Promise<string | null> => {
	try {
		return await installationToken()
	} catch (error) {
		console.warn('No GitHub App installation token — falling back to unauthenticated reads:', error)
		return null
	}
}

/** Current head commit sha of the configured branch. */
export const getHeadSha = async (): Promise<string> => {
	const token = await installationTokenOrNull()
	const ref = await ghJson<{ object: { sha: string } }>(
		`/repos/${env.GITHUB_REPO}/git/ref/heads/${env.GITHUB_BRANCH}`,
		token,
	)
	return ref.object.sha
}

/** Raw file content at an exact commit — sha-addressed, so never stale. null on 404. */
export const getRawFile = async (sha: string, path: string): Promise<string | null> => {
	const res = await fetch(`https://raw.githubusercontent.com/${env.GITHUB_REPO}/${sha}/${path}`, {
		headers: { 'User-Agent': UA },
	})
	if (res.status === 404) return null
	if (!res.ok) throw new Error(`raw ${path}@${sha.slice(0, 8)} → ${res.status}`)
	return res.text()
}

export type CommitFile = { path: string; content: string }
export type CommitAuthor = { name: string; email: string }

type CommitResult = { sha: string; url: string }

/**
 * One commit on the configured branch via the Git Data API. Committer is the
 * App; author is the translator. `buildFiles` receives the live head sha and
 * must produce contents merged onto that head, so a ref race retry re-merges.
 */
export const commitOnHead = async ({
	buildFiles,
	message,
	author,
}: {
	buildFiles: (headSha: string) => Promise<CommitFile[]>
	/** Evaluated after buildFiles, so it can reflect what actually changed. */
	message: () => string
	author: CommitAuthor
}): Promise<CommitResult | null> => {
	const token = await installationToken()
	const repo = env.GITHUB_REPO
	let lastError: unknown
	for (let attempt = 0; attempt < 2; attempt++) {
		const headSha = await getHeadSha()
		const files = await buildFiles(headSha)
		if (files.length === 0) return null
		const head = await ghJson<{ tree: { sha: string } }>(`/repos/${repo}/git/commits/${headSha}`, token)
		const tree = await ghJson<{ sha: string }>(`/repos/${repo}/git/trees`, token, {
			method: 'POST',
			body: JSON.stringify({
				base_tree: head.tree.sha,
				tree: files.map((file) => ({ path: file.path, mode: '100644', type: 'blob', content: file.content })),
			}),
		})
		const commit = await ghJson<{ sha: string; html_url: string }>(`/repos/${repo}/git/commits`, token, {
			method: 'POST',
			body: JSON.stringify({ message: message(), tree: tree.sha, parents: [headSha], author }),
		})
		const updated = await ghFetch(`/repos/${repo}/git/refs/heads/${env.GITHUB_BRANCH}`, token, {
			method: 'PATCH',
			body: JSON.stringify({ sha: commit.sha }),
		})
		if (updated.ok) return { sha: commit.sha, url: commit.html_url }
		lastError = new Error(`ref update → ${updated.status}: ${(await updated.text()).slice(0, 200)}`)
	}
	throw lastError instanceof Error ? lastError : new Error('commit failed')
}
