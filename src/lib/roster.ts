import type { Roster } from './types'

/** Absent roster file (null) means anyone authenticated may translate anything. */
export const canTranslate = ({
	roster,
	login,
	locale,
}: {
	roster: Roster | null
	login: string
	locale: string
}): boolean => {
	if (roster === null) return true
	const allowed = roster[login]
	if (allowed === undefined) return false
	if (allowed === '*') return true
	return allowed.includes(locale)
}
