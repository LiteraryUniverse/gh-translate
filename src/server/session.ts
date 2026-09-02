import { useSession } from '@tanstack/solid-start/server'
import type { SessionUser } from '~/lib/types'
import { env } from './env'

type SessionData = { user?: SessionUser }

// ponytail: sealed-cookie sessions, no server-side store — revocation short of
// rotating SESSION_SECRET is impossible; accepted for a translation tool.
export const useAppSession = () =>
	useSession<SessionData>({
		name: 'ft_session',
		password: env.SESSION_SECRET,
		maxAge: 60 * 60 * 24 * 14,
	})

export const getSessionUser = async (): Promise<SessionUser | null> => {
	const session = await useAppSession()
	return session.data.user ?? null
}
