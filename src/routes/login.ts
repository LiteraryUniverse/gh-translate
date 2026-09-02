import { createFileRoute } from '@tanstack/solid-router'
import { setCookie } from '@tanstack/solid-start/server'
import { env } from '~/server/env'

export const Route = createFileRoute('/login')({
	server: {
		handlers: {
			GET: ({ request }) => {
				const state = crypto.randomUUID()
				setCookie('ft_state', state, { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 600 })
				const url = new URL('https://github.com/login/oauth/authorize')
				url.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID)
				url.searchParams.set('redirect_uri', `${new URL(request.url).origin}/auth/callback`)
				url.searchParams.set('state', state)
				return new Response(null, { status: 302, headers: { Location: url.toString() } })
			},
		},
	},
})
