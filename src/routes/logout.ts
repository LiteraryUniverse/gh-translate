import { createFileRoute } from '@tanstack/solid-router'
import { useAppSession } from '~/server/session'

export const Route = createFileRoute('/logout')({
	server: {
		handlers: {
			GET: async () => {
				const session = await useAppSession()
				await session.clear()
				return new Response(null, { status: 302, headers: { Location: '/' } })
			},
		},
	},
})
