/** True when the PEM is a real PKCS#8 key, not the .dev.vars.example placeholder. */
export const looksLikeAppKey = (pem: string): boolean => {
	const body = pem.replace(/\\n/g, '\n')
	if (!body.includes('BEGIN PRIVATE KEY')) return false
	const inner = body.replace(/-----[A-Z ]+-----/g, '').replace(/\s/g, '')
	return inner.length > 80 && !inner.includes('...')
}

export const isPkcs1Key = (pem: string): boolean => pem.replace(/\\n/g, '\n').includes('BEGIN RSA PRIVATE KEY')

export const formatGithubHttpError = ({
	method,
	path,
	status,
	body,
	authenticated,
}: {
	method: string
	path: string
	status: number
	body: string
	authenticated: boolean
}): string => {
	if (status === 403 && /rate limit exceeded/i.test(body)) {
		return authenticated
			? `GitHub rate limit hit on authenticated requests (${path}). Retry shortly.`
			: `GitHub unauthenticated rate limit (${path}). Set GITHUB_APP_ID and a PKCS#8 GITHUB_APP_PRIVATE_KEY so reads use the App installation token — Cloudflare Worker IPs share GitHub's 60 requests/hour quota.`
	}
	return `GitHub ${method} ${path} → ${status}: ${body.slice(0, 300)}`
}
