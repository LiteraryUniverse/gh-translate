/** Split a module's wiki page into per-key sections by `## <full.message.key>` headings. */
export const splitWikiPage = (markdown: string): { intro: string; sections: Record<string, string> } => {
	const parts = markdown.split(/^##\s+(\S+)\s*$/m)
	const intro = (parts[0] ?? '').trim()
	const sections: Record<string, string> = {}
	for (let i = 1; i < parts.length; i += 2) {
		const body = (parts[i + 1] ?? '').trim()
		if (body) sections[parts[i]] = body
	}
	return { intro, sections }
}
