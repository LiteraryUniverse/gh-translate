import { describe, expect, it } from 'vitest'
import { splitWikiPage } from './wiki'

describe('splitWikiPage', () => {
	it('maps headings to section bodies', () => {
		const page = 'Module intro.\n\n## common.save\nMeans persisting.\n\n![img](https://x/y.png)\n\n## a11y.navigation\nScreen-reader label.\n'
		const { intro, sections } = splitWikiPage(page)
		expect(intro).toBe('Module intro.')
		expect(sections['common.save']).toContain('persisting')
		expect(sections['common.save']).toContain('![img]')
		expect(sections['a11y.navigation']).toBe('Screen-reader label.')
	})
	it('ignores empty sections and handles pages without headings', () => {
		expect(splitWikiPage('just text')).toEqual({ intro: 'just text', sections: {} })
		expect(splitWikiPage('## key\n\n## other\nbody').sections).toEqual({ other: 'body' })
	})
})
