import { describe, expect, it } from 'vitest'
import { blobUrl, commitUrl, repoUrl, wikiEditUrl, wikiPageUrl } from './githubUrls'

const repo = 'LiteraryUniverse/intl-web'

describe('githubUrls', () => {
	it('builds repository, commit, and blob URLs', () => {
		expect(repoUrl(repo)).toBe('https://github.com/LiteraryUniverse/intl-web')
		expect(commitUrl(repo, 'abc123def')).toBe('https://github.com/LiteraryUniverse/intl-web/commit/abc123def')
		expect(blobUrl(repo, 'master', 'cs/cookieconsent.json')).toBe(
			'https://github.com/LiteraryUniverse/intl-web/blob/master/cs/cookieconsent.json',
		)
	})
	it('builds wiki view and edit URLs', () => {
		expect(wikiPageUrl(repo)).toBe('https://github.com/LiteraryUniverse/intl-web/wiki')
		expect(wikiPageUrl(repo, 'Home')).toBe('https://github.com/LiteraryUniverse/intl-web/wiki')
		expect(wikiPageUrl(repo, 'common')).toBe('https://github.com/LiteraryUniverse/intl-web/wiki/common')
		expect(wikiEditUrl(repo, 'Home')).toBe('https://github.com/LiteraryUniverse/intl-web/wiki/Home/_edit')
		expect(wikiEditUrl(repo, 'common')).toBe('https://github.com/LiteraryUniverse/intl-web/wiki/common/_edit')
	})
})
