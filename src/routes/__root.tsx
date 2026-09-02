/// <reference types="vite/client" />
import { HeadContent, Link, Outlet, Scripts, createRootRoute } from '@tanstack/solid-router'
import { HydrationScript } from 'solid-js/web'
import { Show, type JSX } from 'solid-js'
import { sessionUserFn } from '~/server/fns'
import appCss from '~/styles/app.css?url'

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charset: 'utf-8' },
			{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
			{ title: 'Formatted Translator' },
		],
		links: [{ rel: 'stylesheet', href: appCss }],
	}),
	loader: () => sessionUserFn(),
	shellComponent: RootDocument,
	component: Layout,
})

function Layout() {
	const user = Route.useLoaderData()
	return (
		<>
			<header class="header">
				<Link to="/" class="brand">
					Formatted Translator
				</Link>
				<Link to="/help">Help</Link>
				<span class="spacer" />
				<Show
					when={user()}
					fallback={
						<a class="btn" href="/login">
							Sign in with GitHub
						</a>
					}
				>
					{(sessionUser) => (
						<span class="user">
							<img src={sessionUser().avatar} alt="" />
							{sessionUser().login}
							<a href="/logout">Sign out</a>
						</span>
					)}
				</Show>
			</header>
			<Outlet />
		</>
	)
}


function RootDocument({ children }: { children: JSX.Element }) {
	return (
		<html lang="en">
			<head>
				<HydrationScript />
			</head>
			<body>
				<HeadContent />
				{children}
				<Scripts />
			</body>
		</html>
	)
}
