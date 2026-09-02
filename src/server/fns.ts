import { createServerFn } from '@tanstack/solid-start'
import { validateTranslation } from '~/lib/icu'
import { flattenMessages, isEditableTree, mergeDrafts, stringifyMessages } from '~/lib/messages'
import { canTranslate } from '~/lib/roster'
import type { FlatMessages, MessageTree, Roster } from '~/lib/types'
import { env } from './env'
import { commitOnHead, getHeadSha, getRawFile, ghJson, installationTokenOrNull, type CommitFile } from './github'
import { getSessionUser } from './session'

const LOCALE_RE = /^[A-Za-z0-9-]{2,20}$/
const MODULE_RE = /^[A-Za-z0-9_-]{1,60}$/

export type RepoInfo = {
	repo: string
	branch: string
	head: string
	sourceLocale: string
	locales: string[]
	modules: string[]
	roster: Roster | null
}

export const sessionUserFn = createServerFn().handler(async () => getSessionUser())

const REPO_INFO_TTL_MS = 60_000
const repoInfoCacheRequest = (): Request =>
	new Request(`https://formatted-translator.internal/repo-info/${env.GITHUB_REPO}/${env.GITHUB_BRANCH}`)

let repoInfoMemory: { info: RepoInfo; expiresAt: number } | null = null

const repoInfoStore = (): Promise<Cache> => caches.open('formatted-translator')

const readRepoInfoCache = async (): Promise<RepoInfo | null> => {
	if (repoInfoMemory && Date.now() < repoInfoMemory.expiresAt) return repoInfoMemory.info
	try {
		const hit = await (await repoInfoStore()).match(repoInfoCacheRequest())
		if (!hit) return null
		const info = (await hit.json()) as RepoInfo
		repoInfoMemory = { info, expiresAt: Date.now() + REPO_INFO_TTL_MS }
		return info
	} catch {
		return null
	}
}

const writeRepoInfoCache = async (info: RepoInfo): Promise<void> => {
	repoInfoMemory = { info, expiresAt: Date.now() + REPO_INFO_TTL_MS }
	try {
		await (await repoInfoStore()).put(
			repoInfoCacheRequest(),
			new Response(JSON.stringify(info), {
				headers: { 'Content-Type': 'application/json', 'Cache-Control': 'max-age=60' },
			}),
		)
	} catch {
		// Cache API is optional (some local/test runtimes); memory still holds.
	}
}

const bustRepoInfoCache = async (): Promise<void> => {
	repoInfoMemory = null
	try {
		await (await repoInfoStore()).delete(repoInfoCacheRequest())
	} catch {
		// ignore
	}
}

export const repoInfoFn = createServerFn().handler(async (): Promise<RepoInfo> => {
	const cached = await readRepoInfoCache()
	if (cached) return cached
	const head = await getHeadSha()
	const token = await installationTokenOrNull()
	const tree = await ghJson<{ tree: Array<{ path: string; type: string }> }>(
		`/repos/${env.GITHUB_REPO}/git/trees/${head}?recursive=1`,
		token,
	)
	const locales = tree.tree
		.filter((entry) => entry.type === 'tree' && !entry.path.includes('/') && !['scripts', '.github'].includes(entry.path))
		.map((entry) => entry.path)
		.sort()
	const modules = tree.tree
		.filter((entry) => entry.type === 'blob')
		.map((entry) => entry.path)
		.filter((path) => path.startsWith(`${env.SOURCE_LOCALE}/`) && path.endsWith('.json'))
		.map((path) => path.slice(env.SOURCE_LOCALE.length + 1, -'.json'.length))
		.filter((module) => module !== 'index')
		.sort()
	const rosterRaw = await getRawFile(head, 'translators.json')
	const info: RepoInfo = {
		repo: env.GITHUB_REPO,
		branch: env.GITHUB_BRANCH,
		head,
		sourceLocale: env.SOURCE_LOCALE,
		locales,
		modules,
		roster: rosterRaw ? (JSON.parse(rosterRaw) as Roster) : null,
	}
	await writeRepoInfoCache(info)
	return info
})

export const wikiPageFn = createServerFn()
	.validator((input: { page: string }) => input)
	.handler(async ({ data }): Promise<string | null> => {
		if (!MODULE_RE.test(data.page) && data.page !== 'Home') return null
		const res = await fetch(`https://raw.githubusercontent.com/wiki/${env.GITHUB_REPO}/${data.page}.md`, {
			headers: { 'User-Agent': 'formatted-translator' },
		})
		return res.ok ? res.text() : null
	})

export type SaveInput = { locale: string; drafts: Record<string, FlatMessages> }
export type SaveResult = { sha: string | null; url: string | null; saved: number }

export const saveTranslationsFn = createServerFn({ method: 'POST' })
	.validator((input: SaveInput) => input)
	.handler(async ({ data }): Promise<SaveResult> => {
		const user = await getSessionUser()
		if (!user) throw new Error('Sign in to save translations')
		const { locale, drafts } = data
		if (!LOCALE_RE.test(locale)) throw new Error('Bad locale')
		if (locale === env.SOURCE_LOCALE) throw new Error(`${env.SOURCE_LOCALE} is the source locale and is edited by developers only`)
		let saved = 0
		let touched: string[] = []
		const buildFiles = async (headSha: string): Promise<CommitFile[]> => {
			const rosterRaw = await getRawFile(headSha, 'translators.json')
			const roster = rosterRaw ? (JSON.parse(rosterRaw) as Roster) : null
			if (!canTranslate({ roster, login: user.login, locale }))
				throw new Error(`@${user.login} is not on the roster for ${locale} — see translators.json`)
			saved = 0
			touched = []
			const files: CommitFile[] = []
			const errors: string[] = []
			for (const [module, moduleDrafts] of Object.entries(drafts)) {
				if (!MODULE_RE.test(module)) throw new Error(`Bad module name: ${module}`)
				const sourceRaw = await getRawFile(headSha, `${env.SOURCE_LOCALE}/${module}.json`)
				if (sourceRaw === null) {
					errors.push(`${module}: unknown module`)
					continue
				}
				const source = JSON.parse(sourceRaw) as MessageTree
				const liveRaw = await getRawFile(headSha, `${locale}/${module}.json`)
				const live = liveRaw ? (JSON.parse(liveRaw) as MessageTree) : {}
				if (!isEditableTree(source) || !isEditableTree(live)) {
					errors.push(`${module}: contains non-string entries; edit it on GitHub directly`)
					continue
				}
				const flatSource = flattenMessages(source)
				for (const [key, value] of Object.entries(moduleDrafts)) {
					if (!(key in flatSource)) errors.push(`${module} / ${key}: unknown key`)
					else if (value.trim() !== '') {
						const problem = validateTranslation({ source: flatSource[key], translation: value })
						if (problem) errors.push(`${module} / ${key}: ${problem}`)
					}
				}
				if (errors.length > 0) continue
				const { tree, changed } = mergeDrafts({ live, source, drafts: moduleDrafts })
				if (changed.length === 0) continue
				saved += changed.length
				touched.push(module)
				files.push({ path: `${locale}/${module}.json`, content: stringifyMessages(tree) })
			}
			if (errors.length > 0) throw new Error(errors.join('\n'))
			return files
		}
		const result = await commitOnHead({
			buildFiles,
			message: () => `${locale}: ${saved} string${saved === 1 ? '' : 's'} (${touched.join(', ')}) via Formatted Translator`,
			author: { name: user.name || user.login, email: `${user.id}+${user.login}@users.noreply.github.com` },
		})
		if (result) await bustRepoInfoCache()
		return { sha: result?.sha ?? null, url: result?.url ?? null, saved: result ? saved : 0 }
	})
