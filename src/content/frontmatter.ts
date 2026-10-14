/**
 * Minimal front matter: a leading block between `---` lines of `key: value` pairs.
 * Values are strings, numbers, booleans or comma-separated lists in [brackets].
 * Kept dependency-free so the same parser runs in the build check script.
 */
export interface Parsed<M = Record<string, unknown>> {
  meta: M
  body: string
}

export function parseFrontMatter<M = Record<string, unknown>>(src: string): Parsed<M> {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(src)
  if (!m) return { meta: {} as M, body: src }
  const meta: Record<string, unknown> = {}
  for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':')
    if (i < 0) continue
    const key = line.slice(0, i).trim()
    const raw = line.slice(i + 1).trim()
    meta[key] = coerce(raw)
  }
  return { meta: meta as M, body: src.slice(m[0].length) }
}

function coerce(raw: string): unknown {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
  if (raw.startsWith('[') && raw.endsWith(']'))
    return raw
      .slice(1, -1)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  return raw.replace(/^"(.*)"$/, '$1')
}

/** Split a markdown body into H2 sections, keyed by the heading's `{#id}` or its text. */
export interface Section {
  id: string
  title: string
  body: string
  sub: Section[]
}

export function splitSections(body: string, level = 2): Section[] {
  const re = new RegExp(`^${'#'.repeat(level)}\\s+(.+?)\\s*$`, 'gm')
  const out: Section[] = []
  let last: { id: string; title: string; start: number } | null = null
  const push = (end: number) => {
    if (!last) return
    const text = body.slice(last.start, end).trim()
    const sub = level < 3 ? splitSections(text, level + 1) : []
    const own = sub.length ? text.slice(0, text.search(new RegExp(`^${'#'.repeat(level + 1)}\\s`, 'm'))).trim() : text
    out.push({ id: last.id, title: last.title, body: own, sub })
  }
  for (const m of body.matchAll(re)) {
    push(m.index!)
    const idm = /\{#([\w-]+)\}\s*$/.exec(m[1])
    const title = idm ? m[1].slice(0, idm.index).trim() : m[1].trim()
    last = { id: idm ? idm[1] : slug(title), title, start: m.index! + m[0].length }
  }
  push(body.length)
  return out
}

export function slug(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
