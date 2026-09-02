import { createRouter } from '@tanstack/solid-router'
import { routeTree } from './routeTree.gen'

export function getRouter() {
	return createRouter({
		routeTree,
		defaultPreload: 'intent',
		defaultErrorComponent: ({ error }) => <main class="notice err">{error.message}</main>,
		defaultNotFoundComponent: () => <main class="notice info">Page not found.</main>,
		scrollRestoration: true,
	})
}
