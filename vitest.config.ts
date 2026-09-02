import { defineConfig } from 'vitest/config'

// Pure-logic tests only (src/lib) — nothing here may import 'cloudflare:workers'.
export default defineConfig({
	test: {
		include: ['src/lib/**/*.test.ts'],
	},
})
