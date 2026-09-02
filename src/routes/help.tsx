import { createFileRoute } from '@tanstack/solid-router'
import { Show } from 'solid-js'
import { Markdown } from '~/components/Markdown'
import { repoInfoFn, wikiPageFn } from '~/server/fns'

export const Route = createFileRoute('/help')({
	loader: async () => {
		const [info, home] = await Promise.all([repoInfoFn(), wikiPageFn({ data: { page: 'Home' } })])
		return { info, home }
	},
	component: HelpPage,
})

function HelpPage() {
	const data = Route.useLoaderData()
	return (
		<main>
			<h1>Translator guide</h1>
			<Show
				when={data().home}
				fallback={
					<p class="notice info">
						No wiki Home page yet — write one at{' '}
						<a href={`https://github.com/${data().info.repo}/wiki`}>the project wiki</a>. Context for individual
						strings lives on one wiki page per module, under a <code>## full.message.key</code> heading.
					</p>
				}
			>
				{(markdown) => <Markdown markdown={markdown()} />}
			</Show>
		</main>
	)
}
