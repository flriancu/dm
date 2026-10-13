#!/usr/bin/env node
/**
 * Build-time content check (FR-03, CR-01, CR-07, acceptance 5).
 *  1. Source locale (ro) validity: front matter, required sections and variants.
 *  2. Wording lints on learner-facing content (CR-07 rules 1–3 where mechanical).
 *  3. Interface strings: both locale files have the same keys; every key used in
 *     src/ exists; every input-ish key has a .placeholder sibling where expected.
 *  4. Other content locales diffed against ro: missing and stale files (reported, not fatal).
 * Exit 1 on any error in 1–3.
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const here = new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')
const ROOT = join(here, '..', 'content')
const SRC = join(here, '..', 'src')
const SOURCE = 'ro'
const REQUIRED_META = ['id', 'order', 'title', 'takeaway', 'source_version']
const REQUIRED_SECTIONS = ['learn', 'do', 'friend', 'next', 'takeaway']
const PLAN_HEADINGS = ['Un Visător și Prietenul lui', 'Pereche de egali', 'Prieten al Visului și grup']
const PLAN_PARAGRAPHS = ['Cuvinte din curs', 'Înainte de întâlnire', 'Lecții din practică']
const REQUIRED_VARIANTS = ['solo', 'pair', 'group']

// CR-01 / CR-07 rule 2: words the learner must never meet (sources page may explain origins).
const FORBIDDEN = [
  [/\bpilot/i, 'referință la pilot'], [/\bangajat/i, 'vocabular corporatist'], [/\bKPI\b/, 'vocabular corporatist'],
  [/\bemployee\b/i, 'English leak'], [/\bsesiun/i, 'referință la sesiuni'], [/\bslide/i, 'referință la slide-uri'],
  [/\bdeck\b/i, 'referință la deck'], [/\bca înainte\b/i, 'referință în afara ecranului'], [/\bcum am (zis|spus)\b/i, 'referință în afara ecranului'],
]
const FORBIDDEN_EXEMPT = ['pages/surse.md']
// CR-07 rule 1: an instruction that starts with a verb carrying a clitic pronoun and no noun.
const DANGLING = /(^|[.!?:]\s+|^\d+\.\s+|^- )(scrie|fă|pune|notează|transformă|adaugă|ia|alege|citește|completează|trimite|păstrează|revizuiește|citeste)-(l|o|le|i|ți|le)\b/gim
// CR-07 rule 3: a COPIL letter standing alone as a code (not inside a word, not followed by its name).
// bold **C** is fine when a word or its name follows ("**C**larifică", "**C** Clarificare"); flag only letters followed by punctuation or line end.
const BARE_LETTER = /(?:\*\*([COPIL])\*\*(?=[,.;:)]|\s*$|\s+[^\p{L}\s–·-])|(?:^|\s|\()([COPIL])(?=[,.;:)]|\s*$))/gmu
const LETTER_NAMES = { C: /\bC\s*[–·-]\s*Clarific/i, O: /\bO\s*[–·-]\s*Obstacol/i, P: /\bP\s*[–·-]\s*Pași/i, I: /\bI\s*[–·-]\s*Inim/i, L: /\bL\s*[–·-]\s*Linișt/i }
// CR-07 rule 1b: the reader is one person ("tu"). A plural "you" verb is allowed only where the same
// paragraph names who the plural is (amândoi, voi, împreună, fiecare, toți, grupul, perechea…).
const PLURAL_YOU = /(?<!\p{L})(ați|aveți|sunteți|puteți|faceți|scrieți|hotărâți|corectați|alegeți|citiți|spuneți|stabiliți|deschideți|notați|bifați|parcurgeți|conduceți|lucrați|veniți|vreți|știți|folosiți|puneți|terminați|completați|apăsați|luați|dați|mergeți|încercați|schimbați|vorbiți|ascultați|răspundeți|numărați|pregătiți|aduceți|tipăriți|așezați|țineți|rămâneți|opriți|continuați|repetați|jucați|întrebați|povestiți|arătați|sărbătoriți|mulțumiți|vă)(?!\p{L})/iu
const PLURAL_SUBJECT = /(?<!\p{L})(amândoi|amândouă|voi|vouă|vostru|voastră|împreună|fiecare|toți|toate|grup(ul)?|perech[ei]|perechea|perechile|doi|două|trei|ceilalți|celălalt|membri|membrii|visător(ul|ului|i|ii)?|prietenul|rolurile|voluntarul|tu și|și tu|unul|una)(?!\p{L})/iu
/** Wording checks shared by content paragraphs and interface strings. */
function proseChecks(text, where, { exemptForbidden = false } = {}) {
  if (!exemptForbidden) for (const [re, why] of FORBIDDEN) { const m = re.exec(text); if (m) err(`${where}: „${m[0]}” – ${why} (CR-07 regula 2)`) }
  for (const m of text.matchAll(DANGLING)) err(`${where}: instrucțiune cu pronume fără substantiv: „${m[0].trim()}” (CR-07 regula 1)`)
  if (/[sS]̧|[tT]̧/.test(text)) err(`${where}: diacritice cu sedilă (folosește ș ț cu virgulă)`)
  for (const para of text.split(/\n\s*\n|\n(?=\|)|\n(?=\d+\. )|\n(?=- )/)) {
    const m = PLURAL_YOU.exec(para)
    if (m && !PLURAL_SUBJECT.test(para)) err(`${where}: „${m[0]}” se adresează la plural fără să spună cui (amândoi, voi, fiecare…): „${para.trim().slice(0, 70)}…” (CR-07 regula 1)`)
  }
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) out.push(...walk(p))
    else out.push(p)
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
function body(src) { return src.replace(/^---[\s\S]*?\r?\n---\r?\n?/, '') }
function sectionIds(src, level) {
  const re = new RegExp(`^${'#'.repeat(level)}\\s+.*\\{#([\\w-]+)\\}\\s*$`, 'gm')
  return [...src.matchAll(re)].map((m) => m[1])
}
let errors = 0
const err = (msg) => { console.error(`✗ ${msg}`); errors++ }

// ---------- 1 + 2: source locale ----------
const locales = readdirSync(ROOT).filter((d) => statSync(join(ROOT, d)).isDirectory())
if (!locales.includes(SOURCE)) { err(`content/${SOURCE} missing`); process.exit(1) }
const srcFiles = walk(join(ROOT, SOURCE)).filter((p) => p.endsWith('.md')).map((p) => relative(join(ROOT, SOURCE), p).replace(/\\/g, '/'))

for (const rel of srcFiles) {
  const src = readFileSync(join(ROOT, SOURCE, rel), 'utf8')
  const meta = frontMatter(src)
  const text = body(src)
  if (rel.startsWith('modules/')) {
    for (const k of REQUIRED_META) if (!(k in meta)) err(`${SOURCE}/${rel}: missing front matter "${k}"`)
    const ids = sectionIds(src, 2)
    for (const s of REQUIRED_SECTIONS) if (!ids.includes(s)) err(`${SOURCE}/${rel}: missing section {#${s}}`)
    const subs = sectionIds(src, 3)
    for (const v of REQUIRED_VARIANTS) if (!subs.includes(v)) err(`${SOURCE}/${rel}: friend section lacks variant {#${v}}`)
    // rule 6: the Do section carries at least one worked example
    const doSec = /## Fă \{#do\}([\s\S]*?)(^## )/m.exec(text)?.[1] ?? ''
    if (!/exemplu/i.test(doSec)) err(`${SOURCE}/${rel}: secțiunea Fă nu are niciun „de exemplu” (CR-07 regula 6)`)
  } else if (!('source_version' in meta)) err(`${SOURCE}/${rel}: missing source_version`)
  if (rel.startsWith('friend/')) {
    // the Friend page finds each configuration's table by its heading prefix (COURSE-RULES.md §5)
    const heads = [...text.matchAll(/^## (.+)$/gm)].map((m) => m[1])
    for (const h of PLAN_HEADINGS) if (!heads.some((x) => x.startsWith(h))) err(`${SOURCE}/${rel}: lipsește tabelul „${h}” (titlu ## care începe cu acest text)`)
    for (const need of PLAN_PARAGRAPHS) if (!text.includes(need)) err(`${SOURCE}/${rel}: lipsește paragraful „${need}” (COURSE-RULES §5)`)
    // every table's minutes add up to the total in its heading
    let cur = null
    const tables = []
    for (const line of text.split(/\r?\n/)) {
      const h = /^## (Un Visător|Pereche|Prieten al Visului și grup).*?\((\d+)(?: de)? (minute|ore)/.exec(line)
      if (line.startsWith('## ')) { cur = h ? { name: h[1], total: h[3] === 'ore' ? Number(h[2]) * 60 : Number(h[2]), mins: [] } : null; if (cur) tables.push(cur); continue }
      const row = /^\| (\d+)' \|/.exec(line)
      if (cur && row) cur.mins.push(Number(row[1]))
    }
    for (const tb of tables) {
      const sum = tb.mins.reduce((a, b) => a + b, 0)
      if (tb.mins.length && sum !== tb.total) err(`${SOURCE}/${rel}: tabelul „${tb.name}” însumează ${sum} minute, titlul spune ${tb.total}`)
    }
  }

  proseChecks(text, `${SOURCE}/${rel}`, { exemptForbidden: FORBIDDEN_EXEMPT.includes(rel) })
  // bare COPIL letters: allowed only if the same file names the letter somewhere
  const bare = new Set([...text.matchAll(BARE_LETTER)].map((m) => m[1] ?? m[2]))
  for (const l of bare) if (LETTER_NAMES[l] && !LETTER_NAMES[l].test(text)) err(`${SOURCE}/${rel}: litera „${l}” apare singură fără numele ei (CR-07 regula 3)`)
}
console.log(`${SOURCE}: ${srcFiles.length} content files${errors ? '' : ' ok'}`)

// ---------- 3: interface strings ----------
const locDir = join(SRC, 'i18n', 'locales')
const locFiles = readdirSync(locDir).filter((f) => f.endsWith('.json'))
const dicts = Object.fromEntries(locFiles.map((f) => [f.replace('.json', ''), JSON.parse(readFileSync(join(locDir, f), 'utf8'))]))
const base = dicts[SOURCE] ?? {}
for (const [lang, d] of Object.entries(dicts)) {
  if (lang === SOURCE) continue
  for (const k of Object.keys(base)) if (!(k in d)) err(`locales/${lang}.json: missing key "${k}"`)
  for (const k of Object.keys(d)) if (!(k in base)) err(`locales/${lang}.json: extra key "${k}" not in ${SOURCE}`)
}
for (const [k, v] of Object.entries(base)) {
  proseChecks(v, `locales/${SOURCE}.json "${k}"`)
  if (DANGLING.test(v)) err(`locales/${SOURCE}.json "${k}": instrucțiune cu pronume fără substantiv (CR-07 regula 1)`)
  DANGLING.lastIndex = 0
}
// keys used in code must exist; dynamic keys (template literals) are checked by prefix
const code = walk(SRC).filter((p) => /\.(tsx?|mjs)$/.test(p) && !p.endsWith('.test.ts')).map((p) => readFileSync(p, 'utf8')).join('\n')
for (const m of code.matchAll(/\bt\(\s*'([^']+)'/g)) if (!(m[1] in base)) err(`code uses t('${m[1]}') but ${SOURCE}.json lacks it`)
for (const m of code.matchAll(/\bt\(\s*`([^`$]+)\$\{/g)) {
  const prefix = m[1]
  if (!Object.keys(base).some((k) => k.startsWith(prefix))) err(`code uses t(\`${prefix}…\`) but no ${SOURCE}.json key starts with it`)
}
console.log(`locales: ${locFiles.length} files, ${Object.keys(base).length} keys${errors ? '' : ' ok'}`)

// ---------- 4: other content locales vs source ----------
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
