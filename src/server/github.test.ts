import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const bindings = vi.hoisted(() => ({
	GITHUB_APP_ID: '',
	GITHUB_APP_PRIVATE_KEY: '',
	GITHUB_REPO: 'LiteraryUniverse/intl-web',
	GITHUB_BRANCH: 'master',
}))

vi.mock('./env', () => ({ env: bindings }))

beforeEach(() => {
	vi.resetModules()
	bindings.GITHUB_APP_ID = ''
	bindings.GITHUB_APP_PRIVATE_KEY = ''
})

afterEach(() => vi.unstubAllGlobals())

describe('GitHub read authentication', () => {
	it('reports a missing App ID before making an unauthenticated request', async () => {
		bindings.GITHUB_APP_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\n${'A'.repeat(200)}\n-----END PRIVATE KEY-----`
		const request = vi.fn().mockResolvedValue(new Response(
			'{"message":"API rate limit exceeded"}', { status: 403 },
		))
		vi.stubGlobal('fetch', request)
		const { getHeadSha } = await import('./github')
		await expect(getHeadSha()).rejects.toThrow('GITHUB_APP_ID is missing')
		expect(request).not.toHaveBeenCalled()
	})

	it('allows unauthenticated browsing when App credentials are absent', async () => {
		const { installationTokenOrNull } = await import('./github')
		await expect(installationTokenOrNull()).resolves.toBeNull()
	})

	it('allows the documented local placeholder', async () => {
		bindings.GITHUB_APP_ID = '123456'
		bindings.GITHUB_APP_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'
		const { installationTokenOrNull } = await import('./github')
		await expect(installationTokenOrNull()).resolves.toBeNull()
	})

	it('uses an installation token for reads when both App credentials are configured', async () => {
		const pair = await crypto.subtle.generateKey(
			{ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
			true, ['sign', 'verify'],
		)
		const key = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey))
		bindings.GITHUB_APP_ID = '123456'
		bindings.GITHUB_APP_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...key))}\n-----END PRIVATE KEY-----`
		const request = vi.fn()
			.mockResolvedValueOnce(Response.json([{ id: 42, account: { login: 'LiteraryUniverse' } }]))
			.mockResolvedValueOnce(Response.json({ token: 'test-installation-token', expires_at: new Date(Date.now() + 3600_000).toISOString() }))
			.mockResolvedValueOnce(Response.json({ object: { sha: 'test-head' } }))
		vi.stubGlobal('fetch', request)
		const { getHeadSha } = await import('./github')
		await expect(getHeadSha()).resolves.toBe('test-head')
		expect(request).toHaveBeenNthCalledWith(3,
			'https://api.github.com/repos/LiteraryUniverse/intl-web/git/ref/heads/master',
			expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-installation-token' }) }),
		)
	})
})
