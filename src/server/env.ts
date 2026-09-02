import { env as workerEnv } from 'cloudflare:workers'

type Secrets = {
	GITHUB_APP_ID: string
	GITHUB_APP_PRIVATE_KEY: string
	GITHUB_OAUTH_CLIENT_ID: string
	GITHUB_OAUTH_CLIENT_SECRET: string
	SESSION_SECRET: string
}

type Vars = {
	GITHUB_REPO: string
	GITHUB_BRANCH: string
	SOURCE_LOCALE: string
}

export const env = workerEnv as Vars & Secrets
