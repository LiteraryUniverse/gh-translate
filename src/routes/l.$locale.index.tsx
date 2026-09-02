import { Link, createFileRoute } from '@tanstack/solid-router'
import { For, Show } from 'solid-js'
import { createClientData } from '~/lib/clientData'
import { flattenMessages, isEditableTree } from '~/lib/messages'
import { fetchModuleTree } from '~/lib/repoFiles'
import type { ModuleInfo } from '~/lib/types'
import { repoInfoFn } from '~/server/fns'

export const Route = createFileRoute('/l/$locale/')({
	loader: () => repoInfoFn(),
	component: ModuleList,
})

function ModuleList() {
	const params = Route.useParams()
	const info = Route.useLoaderData()
	const { data: modules, error } = createClientData(
		() => ({ head: info().head, locale: params().locale }),
		async ({ head, locale }): Promise<ModuleInfo[]> => {
			const { repo, sourceLocale, modules: names } = info()
			return Promise.all(
				names.map(async (module) => {
					const [source, live] = await Promise.all([
						fetchModuleTree({ repo, head, locale: sourceLocale, module }),
						fetchModuleTree({ repo, head, locale, module }),
					])
					const flatSource = flattenMessages(source ?? {})
					const flatLive = flattenMessages(live ?? {})
					const keys = Object.keys(flatSource)
					return {
						module,
						total: keys.length,
						untranslated: keys.filter((key) => !flatLive[key]).length,
						editable: isEditableTree(source ?? {}) && isEditableTree(live ?? {}),
					}
				}),
			)
		},
	)
	const totals = () => {
		const list = modules() ?? []
		const total = list.reduce((sum, m) => sum + m.total, 0)
		const untranslated = list.reduce((sum, m) => sum + m.untranslated, 0)
		return { total, untranslated }
	}
	return (
		<main>
			<h1>
				{params().locale} <small>
					<Show when={modules()}>
						{totals().total - totals().untranslated} / {totals().total} translated
					</Show>
				</small>
			</h1>
			<Show when={error()}>{(text) => <p class="notice err">{text()}</p>}</Show>
			<Show when={modules()} fallback={<p class="notice info">Counting strings…</p>}>
				<table class="modules">
					<thead>
						<tr>
							<th>Module</th>
							<th>Progress</th>
							<th>Untranslated</th>
						</tr>
					</thead>
					<tbody>
						<For each={modules()}>
							{(m) => (
								<tr>
									<td>
										<Show when={m.editable} fallback={<span>{m.module} <span class="badge ro">GitHub only</span></span>}>
											<Link to="/l/$locale/$module" params={{ locale: params().locale, module: m.module }}>
												{m.module}
											</Link>
										</Show>
									</td>
									<td>
										<div class="progress">
											<span style={{ width: `${m.total === 0 ? 100 : Math.round(((m.total - m.untranslated) / m.total) * 100)}%` }} />
										</div>
									</td>
									<td class={m.untranslated > 0 ? 'muted' : ''}>{m.untranslated > 0 ? m.untranslated : '✓'}</td>
								</tr>
							)}
						</For>
					</tbody>
				</table>
			</Show>
		</main>
	)
}
