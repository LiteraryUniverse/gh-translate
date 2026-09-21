import { defineConfig } from 'vitest/config'

// Server tests mock Worker bindings and GitHub requests.
export default defineConfig({
	resolve: {
		tsconfigPaths: true,
	},
	test: {
		include: ['src/lib/**/*.test.ts', 'src/server/**/*.test.ts'],
	},
})
