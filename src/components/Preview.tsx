import { IntlMessageFormat } from 'intl-messageformat'
import { For, Show, createMemo, createSignal } from 'solid-js'
import { getArgSpecs } from '~/lib/icu'

/** Live ICU preview: renders the message with editable sample arguments. */
export const Preview = (props: { message: string; locale: string }) => {
	const specs = createMemo(() => getArgSpecs(props.message))
	const [values, setValues] = createSignal<Record<string, string>>({})
	const output = createMemo(() => {
		try {
			const args: Record<string, unknown> = {}
			for (const spec of specs()) {
				const raw = values()[spec.name]
				if (spec.kind === 'number') args[spec.name] = Number(raw ?? '1') || 0
				else if (spec.kind === 'select') args[spec.name] = raw ?? spec.options?.[0] ?? 'other'
				else if (spec.kind === 'tag') args[spec.name] = (chunks: unknown[]) => chunks
				else args[spec.name] = raw ?? `⟨${spec.name}⟩`
			}
			const result = new IntlMessageFormat(props.message, props.locale).format(args)
			return { text: Array.isArray(result) ? result.flat(9).join('') : String(result) }
		} catch (error) {
			return { error: error instanceof Error ? error.message : String(error) }
		}
	})
	return (
		<div class="preview">
			<Show when={specs().filter((s) => s.kind !== 'tag').length > 0}>
				<div class="preview-args">
					<For each={specs().filter((s) => s.kind !== 'tag')}>
						{(spec) => (
							<label class="preview-arg">
								<span>{spec.name}</span>
								<Show
									when={spec.kind === 'select'}
									fallback={
										<input
											type={spec.kind === 'number' ? 'number' : 'text'}
											value={values()[spec.name] ?? (spec.kind === 'number' ? '1' : '')}
											onInput={(e) => setValues({ ...values(), [spec.name]: e.currentTarget.value })}
										/>
									}
								>
									<select
										value={values()[spec.name] ?? spec.options?.[0]}
										onInput={(e) => setValues({ ...values(), [spec.name]: e.currentTarget.value })}
									>
										<For each={spec.options}>{(option) => <option value={option}>{option}</option>}</For>
									</select>
								</Show>
							</label>
						)}
					</For>
				</div>
			</Show>
			<Show when={output().error} fallback={<div class="preview-output">{output().text}</div>}>
				<div class="preview-error">{output().error}</div>
			</Show>
		</div>
	)
}
