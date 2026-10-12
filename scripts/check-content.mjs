#!/usr/bin/env node
/**
 * Build-time content check (FR-03, acceptance 5).
 * - Every locale under /content is diffed against the source locale (ro).
 * - Missing files are listed. Stale files are listed when the translation's
 *   front-matter `source_version` is lower than the source's.
 * - The source locale itself must have every module with the required front matter
 *   and the required sections.
 * Exit code 1 only on source-locale errors; translation gaps are reported, not fatal,
 * so a partially translated locale can still build (content falls back to ro).
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = new URL('../content/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const SOURCE = 'ro'
const REQUIRED_META = ['id', 'order', 'title', 'takeaway', 'source_version']
const REQUIRED_SECTIONS = ['learn', 'do', 'friend', 'next', 'takeaway']
const REQUIRED_VARIANTS = ['solo', 'pair', 'group']

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else if (name.endsWith('.md')) out.push(p)
  }
  return out
}
function frontMatter(src) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(src)
  const meta = {}
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const i = line.indexOf(':'); if (i < 0) continue
    meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
  }
  return meta
}
function sectionIds(src, level) {
  const re = new RegExp(`^${'#'.repeat(level)}\\s+.*\\{#([\\w-]+)\\}\\s*$`, 'gm')
  return [...src.matchAll(re)].map((m) => m[1])
}

const locales = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory())
if (!locales.includes(SOURCE)) { console.error(`content/${SOURCE} missing`); process.exit(1) }

let errors = 0
const srcFiles = walk(join(ROOT, SOURCE)).map((p) => relative(join(ROOT, SOURCE), p).replace(/\\/g, '/'))

// 1. Source locale validity
for (const rel of srcFiles) {
  const src = readFileSync(join(ROOT, SOURCE, rel), 'utf8')
  const meta = frontMatter(src)
  if (rel.startsWith('modules/')) {
    for (const k of REQUIRED_META) if (!(k in meta)) { console.error(`✗ ${SOURCE}/${rel}: missing front matter "${k}"`); errors++ }
    const ids = sectionIds(src, 2)
    for (const s of REQUIRED_SECTIONS) if (!ids.includes(s)) { console.error(`✗ ${SOURCE}/${rel}: missing section {#${s}}`); errors++ }
    const subs = sectionIds(src, 3)
    for (const v of REQUIRED_VARIANTS) if (!subs.includes(v)) { console.error(`✗ ${SOURCE}/${rel}: friend section lacks variant {#${v}}`); errors++ }
  } else if (!('source_version' in meta)) { console.error(`✗ ${SOURCE}/${rel}: missing source_version`); errors++ }
}
console.log(`${SOURCE}: ${srcFiles.length} content files${errors ? '' : ' ok'}`)

// 2. Other locales vs source
for (const loc of locales.filter((l) => l !== SOURCE)) {
  let missing = 0, stale = 0
  for (const rel of srcFiles) {
    const target = join(ROOT, loc, rel)
    if (!existsSync(target)) { console.log(`  ${loc}: missing ${rel}`); missing++; continue }
    const sv = Number(frontMatter(readFileSync(join(ROOT, SOURCE, rel), 'utf8')).source_version ?? 0)
    const tv = Number(frontMatter(readFileSync(target, 'utf8')).source_version ?? 0)
    if (tv < sv) { console.log(`  ${loc}: stale ${rel} (has ${tv}, source ${sv})`); stale++ }
  }
  console.log(`${loc}: ${srcFiles.length - missing - stale}/${srcFiles.length} up to date, ${missing} missing, ${stale} stale`)
}

process.exit(errors ? 1 : 0)
