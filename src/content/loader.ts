import { marked } from 'marked'
import { parseFrontMatter, splitSections, type Section } from './frontmatter'
import type { ContentLocale } from '../i18n'

/**
 * Course content tree: /content/<lang>/<kind>/<file>.md
 * Every file is lazy-loaded on demand (per-locale, per-module bundles).
 * A new content language is a new folder with the same file names (FR-03).
 */
const files = import.meta.glob('/content/*/**/*.md', { query: '?raw', import: 'default' }) as Record<
  string,
  () => Promise<string>
>

export interface ModuleMeta {
  id: string // "00", "01", ...
  title: string
  subtitle?: string
  letter?: string // COPIL letter(s)
  order: number
  takeaway: string
  sources?: string[]
  source_version: number
  reconstructed?: boolean
  tools?: string[] // app pages the "Fă" section links to; see content/tools.ts
}

export interface ModuleDoc {
  meta: ModuleMeta
  sections: Section[]
  raw: string
}

/** A meeting plan: the text before the first heading, then its `##` sections (three configuration tables, questions, lessons). */
export interface PlanDoc {
  meta: Record<string, unknown>
  preamble: string
  sections: Section[]
}

marked.setOptions({ gfm: true, breaks: false })

/** Markdown to HTML. External links open in a new tab and carry no referrer (NFR-01). */
export function md(s: string): string {
  const html = marked.parse(s, { async: false }) as string
  return html.replace(/<a href="(https?:\/\/[^"]+)"/g, '<a href="$1" target="_blank" rel="noopener noreferrer"')
}

function pathsFor(locale: ContentLocale, kind: string): string[] {
  const prefix = `/content/${locale}/${kind}/`
  return Object.keys(files)
    .filter((p) => p.startsWith(prefix))
    .sort()
}

/** Module ids are two-digit strings ("01"); the front matter parser would read 01 as 1. */
function normalizeMeta(meta: ModuleMeta): ModuleMeta {
  return { ...meta, id: String(meta.id).padStart(2, '0') }
}

export async function listModules(locale: ContentLocale): Promise<ModuleMeta[]> {
  const metas: ModuleMeta[] = []
  for (const p of pathsFor(locale, 'modules')) {
    const src = await files[p]()
    metas.push(normalizeMeta(parseFrontMatter<ModuleMeta>(src).meta))
  }
  return metas.sort((a, b) => a.order - b.order)
}

export async function loadModule(locale: ContentLocale, id: string): Promise<ModuleDoc | null> {
  // only the two-digit id: "02-clarifica" would match the file too, and notes would be saved under that address
  if (!/^\d{2}$/.test(id)) return null
  const p = pathsFor(locale, 'modules').find((x) => x.split('/').pop()!.startsWith(`${id}-`))
  if (!p) return null
  const src = await files[p]()
  const { meta, body } = parseFrontMatter<ModuleMeta>(src)
  return { meta: normalizeMeta(meta), sections: splitSections(body), raw: body }
}

/** Any other markdown document, e.g. friend/01.md, sheets/cover.md, pages/sources.md */
export async function loadDoc(
  locale: ContentLocale,
  kind: string,
  name: string,
): Promise<{ meta: Record<string, unknown>; html: string } | null> {
  const p = `/content/${locale}/${kind}/${name}.md`
  const loader = files[p]
  if (!loader) return null
  const { meta, body } = parseFrontMatter(await loader())
  return { meta, html: md(body) }
}

/** Meeting plan friend/<id>.md, split into preamble and sections so the page can order the configurations. */
export async function loadPlan(locale: ContentLocale, id: string): Promise<PlanDoc | null> {
  const loader = files[`/content/${locale}/friend/${id}.md`]
  if (!loader) return null
  const { meta, body } = parseFrontMatter(await loader())
  const first = body.search(/^##\s/m)
  const preamble = first < 0 ? body : body.slice(0, first)
  return { meta, preamble: preamble.trim(), sections: splitSections(first < 0 ? '' : body.slice(first)) }
}

/** Ids of the meeting plans present for a locale ("01" … "07"), from the content tree itself. */
export async function listPlanIds(locale: ContentLocale): Promise<string[]> {
  return pathsFor(locale, 'friend').map((p) => p.split('/').pop()!.replace(/\.md$/, ''))
}
