import { Link, createFileRoute, useRouter } from '@tanstack/solid-router'
import { For, Show, createMemo, createSignal, onMount } from 'solid-js'
import { createStore, reconcile } from 'solid-js/store'
import { Markdown } from '~/components/Markdown'
import { Preview } from '~/components/Preview'
import { countDrafts, loadDrafts, storeDrafts, type LocaleDrafts } from '~/lib/drafts'
import { getArgSpecs, validateTranslation } from '~/lib/icu'
import { flattenMessages, isEditableTree } from '~/lib/messages'
import { fetchModuleTree } from '~/lib/repoFiles'
import { canTranslate } from '~/lib/roster'
import { splitWikiPage } from '~/lib/wiki'
import { repoInfoFn, saveTranslationsFn, sessionUserFn, wikiPageFn } from '~/server/fns'
import { createClientData } from '~/lib/clientData'

export const Route = createFileRoute('/l/$locale/$module')({
	loader: async ({ params }) => {
		const [info, user, wikiRaw] = await Promise.all([
			repoInfoFn(),
			sessionUserFn(),
			wikiPageFn({ data: { page: params.module } }),
		])
		return { info, user, wiki: wikiRaw ? splitWikiPage(wikiRaw) : null }
	},
	component: Editor,
})

type Notice = { kind: 'ok' | 'err'; text: string }

function Editor() {
	const params = Route.useParams()
	const data = Route.useLoaderData()
	const router = useRouter()
	const { data: files, error: filesError } = createClientData(
		() => ({ head: data().info.head, locale: params().locale, module: params().module }),
		async ({ head, locale, module }) => {
			const { repo, sourceLocale } = data().info
			const [source, live] = await Promise.all([
				fetchModuleTree({ repo, head, locale: sourceLocale, module }),
				fetchModuleTree({ repo, head, locale, module }),
			])
			return { source: source ?? {}, live: live ?? {} }
		},
	)
	const [drafts, setDrafts] = createStore<LocaleDrafts>({})
	onMount(() => setDrafts(reconcile(loadDrafts(params().locale))))
	const flatSource = createMemo(() => flattenMessages(files()?.source ?? {}))
	const flatLive = createMemo(() => flattenMessages(files()?.live ?? {}))
	const fileEditable = createMemo(() => !files() || (isEditableTree(files()?.source) && isEditableTree(files()?.live)))
	const canEdit = createMemo(() => {
		const user = data().user
		return Boolean(
			user && fileEditable() && canTranslate({ roster: data().info.roster, login: user.login, locale: params().locale }),
		)
	})
	const draftOf = (key: string): string | undefined => drafts[params().module]?.[key]
	const setDraft = (key: string, value: string) => {
		if (value === (flatLive()[key] ?? '')) setDrafts(params().module, key, undefined as unknown as string)
		else setDrafts(params().module, { [key]: value })
		storeDrafts(params().locale, JSON.parse(JSON.stringify(drafts)) as LocaleDrafts)
	}
	const [filter, setFilter] = createSignal<'all' | 'todo'>('all')
	const [query, setQuery] = createSignal('')
	const [openPanels, setOpenPanels] = createSignal<Record<string, { preview?: boolean; context?: boolean }>>({})
	const togglePanel = (key: string, panel: 'preview' | 'context') =>
		setOpenPanels((open) => ({ ...open, [key]: { ...open[key], [panel]: !open[key]?.[panel] } }))
	const keys = createMemo(() => {
		const q = query().toLowerCase()
		return Object.keys(flatSource()).filter((key) => {
			if (filter() === 'todo' && flatLive()[key] && draftOf(key) === undefined) return false
			if (q && !key.toLowerCase().includes(q) && !flatSource()[key].toLowerCase().includes(q)) return false
			return true
		})
	})
	const totalDrafts = createMemo(() => countDrafts(drafts))
	const [saving, setSaving] = createSignal(false)
	const [notice, setNotice] = createSignal<Notice | null>(null)
	const save = async () => {
		setSaving(true)
		setNotice(null)
		try {
			const payload = JSON.parse(JSON.stringify(drafts)) as LocaleDrafts
			const result = await saveTranslationsFn({ data: { locale: params().locale, drafts: payload } })
			storeDrafts(params().locale, {})
			setDrafts(reconcile({}))
			setNotice({
				kind: 'ok',
				text: result.sha
					? `Saved ${result.saved} string${result.saved === 1 ? '' : 's'} in commit ${result.sha.slice(0, 8)}.`
					: 'Nothing to save — drafts matched what is already published.',
			})
			await router.invalidate()
		} catch (error) {
			setNotice({ kind: 'err', text: error instanceof Error ? error.message : String(error) })
		} finally {
			setSaving(false)
		}
	}
	const wikiUrl = () => `https://github.com/${data().info.repo}/wiki/${params().module}`
	return (
		<main>
			<h1>
				<Link to="/l/$locale" params={{ locale: params().locale }}>
					{params().locale}
				</Link>{' '}
				/ {params().module} <small>{Object.keys(flatSource()).length} strings</small>
			</h1>
			<Show when={data().wiki?.intro}>{(intro) => <div class="notice info"><Markdown markdown={intro()} /></div>}</Show>
			<Show when={!data().user}>
				<p class="notice info">
					You are browsing read-only. <a href="/login">Sign in with GitHub</a> to translate.
				</p>
			</Show>
			<Show when={data().user && !canEdit() && fileEditable()}>
				<p class="notice info">Your GitHub account is not on the roster for {params().locale} (translators.json).</p>
			</Show>
			<Show when={!fileEditable()}>
				<p class="notice info">
					This module contains non-string entries and cannot be edited here —{' '}
					<a href={`https://github.com/${data().info.repo}/blob/${data().info.branch}/${params().locale}/${params().module}.json`}>
						edit it on GitHub
					</a>
					.
				</p>
			</Show>
			<Show when={notice()}>{(n) => <p class={`notice ${n().kind}`}>{n().text}</p>}</Show>
			<div class="toolbar">
				<div class="tabs">
					<button type="button" class={filter() === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
						All
					</button>
					<button type="button" class={filter() === 'todo' ? 'active' : ''} onClick={() => setFilter('todo')}>
						Untranslated
					</button>
				</div>
				<input
					type="search"
					placeholder="Search key or source text…"
					value={query()}
					onInput={(e) => setQuery(e.currentTarget.value)}
				/>
			</div>
			<Show when={filesError()}>{(text) => <p class="notice err">{text()}</p>}</Show>
			<Show when={files()} fallback={<p class="notice info">Loading strings…</p>}>
				<For each={keys()}>
					{(key) => {
						const value = () => draftOf(key) ?? flatLive()[key] ?? ''
						const problem = () =>
							draftOf(key) !== undefined && draftOf(key) !== ''
								? validateTranslation({ source: flatSource()[key], translation: draftOf(key) as string })
								: undefined
						const hasArgs = () => getArgSpecs(flatSource()[key]).length > 0
						const context = () => data().wiki?.sections[key]
						return (
							<div class="row">
								<div class="key">
									{key}
									<Show when={draftOf(key) !== undefined}>
										<span class="badge draft">draft</span>
									</Show>
									<Show when={!flatLive()[key] && draftOf(key) === undefined}>
										<span class="badge todo">untranslated</span>
									</Show>
								</div>
								<div class="source">{flatSource()[key]}</div>
								<textarea
									value={value()}
									readOnly={!canEdit()}
									onInput={(e) => setDraft(key, e.currentTarget.value)}
								/>
								<Show when={problem()}>{(text) => <div class="inline-error">{text()}</div>}</Show>
								<div class="row-links">
									<Show when={hasArgs()}>
										<button type="button" onClick={() => togglePanel(key, 'preview')}>
											Preview
										</button>
									</Show>
									<Show
										when={context()}
										fallback={
											<a href={wikiUrl()} target="_blank" rel="noreferrer">
												Add context
											</a>
										}
									>
										<button type="button" onClick={() => togglePanel(key, 'context')}>
											Context
										</button>
									</Show>
								</div>
								<Show when={openPanels()[key]?.preview}>
									<Preview message={value() || flatSource()[key]} locale={params().locale} />
								</Show>
								<Show when={openPanels()[key]?.context && context()}>
									{(markdown) => (
										<div class="context">
											<Markdown markdown={markdown()} />
											<a href={`${wikiUrl()}/_edit`} target="_blank" rel="noreferrer">
												Edit context
											</a>
										</div>
									)}
								</Show>
							</div>
						)
					}}
				</For>
			</Show>
			<Show when={canEdit()}>
				<div class="savebar">
					<button type="button" class="btn primary" disabled={saving() || totalDrafts() === 0} onClick={save}>
						{saving() ? 'Saving…' : 'Save'}
					</button>
					<span class="count">
						{totalDrafts()} draft{totalDrafts() === 1 ? '' : 's'} across {params().locale}
					</span>
				</div>
			</Show>
		</main>
	)
}
