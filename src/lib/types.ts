/** One locale module file's parsed JSON. Leaves are strings; tours.json nests. */
export type MessageTree = { [key: string]: string | MessageTree }
/** Flattened dot-path key → message map (validateLocale.mjs semantics). */
export type FlatMessages = Record<string, string>
/** translators.json in the target repo. Login → permitted locales, '*' = all. */
export type Roster = Record<string, string[] | '*'>

export type SessionUser = {
	id: number
	login: string
	name: string
	avatar: string
}

export type ModuleInfo = {
	module: string
	total: number
	untranslated: number
	/** false for files the editor cannot round-trip (non-string leaves, e.g. arrays). */
	editable: boolean
}
