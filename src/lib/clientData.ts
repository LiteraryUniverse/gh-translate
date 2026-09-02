import { createEffect, createSignal, onMount, type Accessor } from 'solid-js'

/**
 * Client-only async data. Message files are deliberately fetched by the
 * browser (see repoFiles.ts) — running these fetches during SSR would burn
 * Worker subrequests, so the fetcher only starts after mount.
 */
export const createClientData = <K, T>(key: Accessor<K>, fetcher: (key: K) => Promise<T>) => {
	const [data, setData] = createSignal<T | undefined>(undefined)
	const [error, setError] = createSignal<string | null>(null)
	onMount(() => {
		createEffect(() => {
			const currentKey = key()
			setData(undefined)
			setError(null)
			fetcher(currentKey).then((value) => setData(() => value)).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)))
		})
	})
	return { data, error }
}
