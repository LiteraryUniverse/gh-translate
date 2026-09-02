import { Link, createFileRoute } from '@tanstack/solid-router'
import { For, Show } from 'solid-js'
import { repoInfoFn } from '~/server/fns'

export const Route = createFileRoute('/')({
	validateSearch: (search: Record<string, unknown>): { login?: 'failed' } =>
		search.login === 'failed' ? { login: 'failed' } : {},
	loader: () => repoInfoFn(),
	component: LocaleIndex,
})

const localeName = (code: string): string => {
	try {
		return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code
	} catch {
		return code
	}
}

function LocaleIndex() {
	const info = Route.useLoaderData()
	const search = Route.useSearch()
	const targets = () => info().locales.filter((locale) => locale !== info().sourceLocale)
	return (
		<main>
			<Show when={search().login === 'failed'}>
				<p class="notice err">GitHub sign-in failed — please try again.</p>
			</Show>
			<h1>
				Locales <small>
					{targets().length} targets · source {info().sourceLocale} · {info().repo}@{info().head.slice(0, 8)}
				</small>
			</h1>
			<div class="grid">
				<For each={targets()}>
					{(locale) => (
						<Link to="/l/$locale" params={{ locale }} class="card">
							<div>{localeName(locale)}</div>
							<div class="code">{locale}</div>
						</Link>
					)}
				</For>
			</div>
		</main>
	)
}
