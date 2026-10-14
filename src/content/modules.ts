/**
 * The course's module ids ("00", "01", …), read from the content files' names
 * (/content/<lang>/modules/NN-slug.md) in every language. Nothing is loaded: only the names.
 */
const paths = Object.keys(import.meta.glob('/content/*/modules/*.md', { query: '?raw', import: 'default' }))

const MODULE_IDS: ReadonlySet<string> = new Set(
  paths.map((p) => p.split('/').pop()!.slice(0, 3)).flatMap((s) => (/^\d{2}-$/.test(s) ? [s.slice(0, 2)] : [])),
)

/** Whether the course has a module with this id. */
export const isCourseModule = (id: unknown): id is string => typeof id === 'string' && MODULE_IDS.has(id)
