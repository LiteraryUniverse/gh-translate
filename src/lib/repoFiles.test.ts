import { afterEach, describe, expect, it, vi } from 'vitest'

const rawFileFn = vi.fn()
vi.mock('~/server/fns', () => ({ rawFileFn }))

const { fetchModuleTree } = await import('./repoFiles')

describe('fetchModuleTree', () => {
	afterEach(() => vi.unstubAllGlobals())

	it('falls back to the Worker when the browser blocks the raw fetch', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
		rawFileFn.mockResolvedValue('{"a":"b"}')
		await expect(fetchModuleTree({ repo: 'o/r', head: 'abc', locale: 'en', module: 'cookieconsent' })).resolves.toEqual({ a: 'b' })
		expect(rawFileFn).toHaveBeenCalledWith({ data: { head: 'abc', path: 'en/cookieconsent.json' } })
	})

	it('still reports HTTP errors from the direct fetch', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })))
		await expect(fetchModuleTree({ repo: 'o/r', head: 'abc', locale: 'en', module: 'x' })).rejects.toThrow('HTTP 500')
	})
})
