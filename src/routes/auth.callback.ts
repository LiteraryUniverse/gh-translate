import { createFileRoute } from '@tanstack/solid-router'
import { deleteCookie, getCookie } from '@tanstack/solid-start/server'
import { env } from '~/server/env'
import { useAppSession } from '~/server/session'

const redirect = (to: string): Response => new Response(null, { status: 302, headers: { Location: to } })

const exchangeCode = async (code: string): Promise<string> => {
	const res = await fetch('https://github.com/login/oauth/access_token', {
		method: 'POST',
		headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'formatted-translator' },
		body: JSON.stringify({
			client_id: env.GITHUB_OAUTH_CLIENT_ID,
			client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
			code,
		}),
	})
	const body = (await res.json()) as { access_token?: string; error_description?: string }
	if (!body.access_token) throw new Error(body.error_description ?? 'GitHub did not return a token')
	return body.access_token
}

export const Route = createFileRoute('/auth/callback')({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const params = new URL(request.url).searchParams
				const code = params.get('code')
				const state = params.get('state')
				if (!code || !state || state !== getCookie('ft_state')) return redirect('/?login=failed')
				deleteCookie('ft_state')
				try {
					// The user token is used once, for identity, and never stored.
					const token = await exchangeCode(code)
					const profile = await fetch('https://api.github.com/user', {
						headers: { Authorization: `Bearer ${token}`, 'User-Agent': 'formatted-translator' },
					})
					if (!profile.ok) return redirect('/?login=failed')
					const gh = (await profile.json()) as { id: number; login: string; name: string | null; avatar_url: string }
					const session = await useAppSession()
					await session.update({ user: { id: gh.id, login: gh.login, name: gh.name ?? gh.login, avatar: gh.avatar_url } })
					return redirect('/')
				} catch {
					return redirect('/?login=failed')
				}
			},
		},
	},
})
