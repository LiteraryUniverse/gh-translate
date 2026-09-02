import type { FlatMessages } from './types'

/** Unsaved edits for one locale, keyed module → flat key → value. Browser-only. */
export type LocaleDrafts = Record<string, FlatMessages>

const storageKey = (locale: string): string => `ft:drafts:${locale}`

export const loadDrafts = (locale: string): LocaleDrafts => {
	if (typeof localStorage === 'undefined') return {}
	try {
		return JSON.parse(localStorage.getItem(storageKey(locale)) ?? '{}') as LocaleDrafts
	} catch {
		return {}
	}
}

export const storeDrafts = (locale: string, drafts: LocaleDrafts): void => {
	if (typeof localStorage === 'undefined') return
	if (countDrafts(drafts) === 0) localStorage.removeItem(storageKey(locale))
	else localStorage.setItem(storageKey(locale), JSON.stringify(drafts))
}

export const countDrafts = (drafts: LocaleDrafts): number =>
	Object.values(drafts).reduce((sum, moduleDrafts) => sum + Object.keys(moduleDrafts).length, 0)
