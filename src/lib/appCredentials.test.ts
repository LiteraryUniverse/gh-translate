import { describe, expect, it } from 'vitest'
import { formatGithubHttpError, isPkcs1Key, looksLikeAppKey } from './appCredentials'

describe('looksLikeAppKey', () => {
	it('rejects the example placeholder and PKCS1 keys', () => {
		expect(looksLikeAppKey('-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----')).toBe(false)
		expect(looksLikeAppKey('')).toBe(false)
		expect(isPkcs1Key('-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA\\n-----END RSA PRIVATE KEY-----')).toBe(true)
	})
	it('accepts a long PKCS#8 body', () => {
		const inner = 'A'.repeat(200)
		expect(looksLikeAppKey(`-----BEGIN PRIVATE KEY-----\n${inner}\n-----END PRIVATE KEY-----`)).toBe(true)
	})
})

describe('formatGithubHttpError', () => {
	it('explains unauthenticated rate limits instead of dumping the JSON body', () => {
		const message = formatGithubHttpError({
			method: 'GET',
			path: '/repos/org/repo/git/ref/heads/master',
			status: 403,
			body: '{"message":"API rate limit exceeded for 172.64.213.122."}',
			authenticated: false,
		})
		expect(message).toContain('unauthenticated rate limit')
		expect(message).toContain('installation token')
		expect(message).not.toContain('172.64')
	})
})
