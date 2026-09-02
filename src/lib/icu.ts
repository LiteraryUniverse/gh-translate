import { parse, TYPE, type MessageFormatElement } from '@formatjs/icu-messageformat-parser'

const hasValue = (
	el: MessageFormatElement,
): el is MessageFormatElement & { value: string } => 'value' in el && typeof el.value === 'string'

const isArgElement = (el: MessageFormatElement): boolean =>
	el.type === TYPE.argument ||
	el.type === TYPE.number ||
	el.type === TYPE.date ||
	el.type === TYPE.time ||
	el.type === TYPE.select ||
	el.type === TYPE.plural ||
	el.type === TYPE.tag

const collect = (elements: MessageFormatElement[], names: Set<string>, recurse: boolean): void => {
	for (const el of elements) {
		if (isArgElement(el) && hasValue(el)) names.add(el.value)
		if (!recurse) continue
		if (el.type === TYPE.select || el.type === TYPE.plural) {
			for (const option of Object.values(el.options)) collect(option.value, names, true)
		} else if (el.type === TYPE.tag) {
			collect(el.children, names, true)
		}
	}
}

const argNames = (message: string, { recurse }: { recurse: boolean }): Set<string> => {
	const names = new Set<string>()
	collect(parse(message, { ignoreTag: false }), names, recurse)
	return names
}

/**
 * Mirrors validateLocale.mjs's rule (translation must not drop the source's
 * top-level placeholders) and adds one stricter guard: any placeholder the
 * translation references anywhere must exist in the source, since the app only
 * supplies the source's arguments and unknown ones throw at format time.
 * Returns an error string, or undefined when valid.
 */
export const validateTranslation = ({
	source,
	translation,
}: {
	source: string
	translation: string
}): string | undefined => {
	let translationArgs: Set<string>
	try {
		translationArgs = argNames(translation, { recurse: true })
	} catch (error) {
		return `Invalid ICU syntax: ${error instanceof Error ? error.message : String(error)}`
	}
	let sourceTop: Set<string>
	let sourceAll: Set<string>
	try {
		sourceTop = argNames(source, { recurse: false })
		sourceAll = argNames(source, { recurse: true })
	} catch {
		return undefined
	}
	const unknown = [...translationArgs].filter((name) => !sourceAll.has(name))
	if (unknown.length > 0) return `Unknown placeholder(s): {${unknown.join('}, {')}}`
	const translationAll = translationArgs
	const dropped = [...sourceTop].filter((name) => !translationAll.has(name))
	if (dropped.length > 0) return `Drops placeholder(s): {${dropped.join('}, {')}}`
	return undefined
}

export type ArgSpec = {
	name: string
	kind: 'text' | 'number' | 'select' | 'tag'
	options?: string[]
}

/** Arguments a message needs, for building preview inputs. Parse errors → []. */
export const getArgSpecs = (message: string): ArgSpec[] => {
	const specs = new Map<string, ArgSpec>()
	const walk = (elements: MessageFormatElement[]): void => {
		for (const el of elements) {
			if (el.type === TYPE.plural || el.type === TYPE.number) {
				specs.set(el.value, { name: el.value, kind: 'number' })
			} else if (el.type === TYPE.select) {
				specs.set(el.value, { name: el.value, kind: 'select', options: Object.keys(el.options) })
			} else if (el.type === TYPE.tag) {
				specs.set(el.value, { name: el.value, kind: 'tag' })
			} else if (isArgElement(el) && hasValue(el) && !specs.has(el.value)) {
				specs.set(el.value, { name: el.value, kind: 'text' })
			}
			if (el.type === TYPE.select || el.type === TYPE.plural) {
				for (const option of Object.values(el.options)) walk(option.value)
			} else if (el.type === TYPE.tag) {
				walk(el.children)
			}
		}
	}
	try {
		walk(parse(message, { ignoreTag: false }))
	} catch {
		return []
	}
	return [...specs.values()]
}
