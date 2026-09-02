import { marked, type Tokens } from 'marked'
import { createMemo } from 'solid-js'

const escapeHtml = (value: string): string =>
	value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

// Wiki authors are semi-trusted; raw HTML is escaped and non-http link
// protocols neutralised as cheap insurance, not a full sanitiser.
marked.use({
	renderer: {
		html: (token: Tokens.HTML | Tokens.Tag) => escapeHtml(token.raw),
	},
	walkTokens: (token) => {
		if (token.type === 'link' && !/^(https?:|\/|#|\.)/i.test(token.href)) token.href = '#'
	},
})

export const Markdown = (props: { markdown: string }) => {
	const html = createMemo(() => marked.parse(props.markdown, { async: false }))
	return <div class="markdown" innerHTML={html()} />
}
