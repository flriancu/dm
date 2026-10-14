// Import regression: backups that used to brick or crash the app, recovery from a broken page, the confirm,
// the tables a file leaves alone, other tabs, and the export/import round trip.
// Usage: node e2e/import-poison.mjs http://localhost:5173/
import { chromium } from 'playwright'
import { readFile } from 'node:fs/promises'

const base = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch()
let failures = 0
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failures++
}
const OK = /Copia a fost încărcată/
const MSG = /Copia a fost încărcată|nu a putut fi citit|prea mare|nu a putut fi încărcată/
const CARD = /nu a putut fi afișată|nu a putut afișa pagina/

// ---- backup files: every table present (empty unless poisoned), so each import replaces everything
const TABLES = ['friendNotes', 'dreamWork', 'weekTasks', 'journal', 'strengthUses', 'reps', 'wheels', 'vision']
const rows = (...kv) => kv.map(([key, value]) => ({ key, value }))
const GOOD = rows(['onboarded', true], ['role', 'both'], ['config', 'group'])
const HEAD = { app: 'dream-course', schema: 1, exportedAt: '2026-10-01T10:00:00.000Z' }
const REQUIRED = { dreams: [], plans: [], moduleNotes: [], settings: GOOD }
const EMPTY = Object.fromEntries(TABLES.map((t) => [t, []]))
const backup = (over = {}, all = true) => ({ ...HEAD, ...(all ? EMPTY : {}), ...REQUIRED, ...over })
const S = (...kv) => ({ settings: [...GOOD, ...rows(...kv)] })
const D = (o) => ({ id: 1, text: 'vis', dateAdded: '2026-10-01', chosen: 1, ...o })
const W = (o) => ({ dreams: [D()], dreamWork: [{ dreamId: 1, updated: '2026-10-01', ...o }] })
const V = (o) => ({ vision: [{ id: 'me', values: [{ text: 'a', chosen: true }], valueActs: [], worksheet: {}, ...o }] })
const RECOVERED = backup({ dreams: [D({ text: 'RECOVERED-OK' })] })
const obj = { a: 1 }

// ---- browser helpers
async function open() {
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 }, locale: 'ro-RO' })
  const page = await ctx.newPage()
  page.errors = []
  page.on('pageerror', (e) => page.errors.push(String(e.message ?? e).slice(0, 200)))
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text().slice(0, 200)))
  return { ctx, page }
}
async function onboard(page) {
  await page.goto(base)
  await page.waitForURL(/#\/start/)
  await page.getByRole('button', { name: 'Visător', exact: true }).click()
  await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click()
  await page.getByRole('button', { name: 'Începe' }).click()
  await page.waitForURL(/#\/$/)
}
async function shown(loc, state = 'visible') {
  try {
    await loc.first().waitFor({ state, timeout: 5000 })
    return true
  } catch {
    return false
  }
}
async function fresh(page, route) {
  await page.goto('about:blank')
  await page.goto(base + '#' + route)
}
const toBuffer = (c) => (Buffer.isBuffer(c) ? c : Buffer.from(typeof c === 'string' ? c : JSON.stringify(c)))
/** Picks a file on #/settings and answers the confirm; returns the question and the status message. */
async function importFile(page, content, { accept = true, wait = true } = {}) {
  await fresh(page, '/settings')
  let question = null
  const onDialog = (d) => {
    question = d.message()
    void (accept ? d.accept() : d.dismiss())
  }
  page.on('dialog', onDialog)
  const buffer = toBuffer(content)
  await page.locator('input[type=file]').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer })
  let msg = ''
  const status = page.getByText(MSG).first()
  if (wait && accept) msg = (await status.textContent({ timeout: 20000 }).catch(() => '')) ?? ''
  else await page.waitForTimeout(800)
  page.off('dialog', onDialog)
  return { question, msg }
}
/** Loads a route from scratch; null when it renders, otherwise what went wrong. */
async function render(page, route) {
  const before = page.errors.length
  await fresh(page, route)
  // the app rendered: the static "loading" placeholder is gone and something is shown
  const rootText = () =>
    !document.getElementById('boot') && document.getElementById('root')?.innerText.trim().length > 0
  await page.waitForFunction(rootText, null, { timeout: 8000 }).catch(() => {})
  await page.waitForTimeout(700)
  const text = await page.evaluate(() =>
    document.getElementById('boot') ? '' : (document.getElementById('root')?.innerText.trim() ?? ''),
  )
  const errs = page.errors.slice(before)
  if (text.length && !CARD.test(text) && !errs.length) return null
  return `${route}: ${!text.length ? 'blank' : CARD.test(text) ? 'error card' : 'error'} ${errs[0] ?? ''}`.trim()
}
/** Every table (or the named ones) read straight from IndexedDB. */
const dump = (page, only = null) =>
  page.evaluate(
    (only) =>
      new Promise((res) => {
        const r = indexedDB.open('dream-course')
        r.onsuccess = () => {
          const d = r.result
          const names = only ?? [...d.objectStoreNames]
          const out = {}
          const tx = d.transaction(names, 'readonly')
          for (const n of names) tx.objectStore(n).getAll().onsuccess = (e) => (out[n] = e.target.result)
          tx.oncomplete = () => (d.close(), res(out))
        }
      }),
    only,
  )
const sortKeys = (_, v) =>
  v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort()) : v
const canon = (x) => JSON.stringify(x, sortKeys)

// ---- 1. files that used to white-screen a page or the whole app: accepted, cleaned, the pages render
const POISON = [
  ['uiLocale "xx"', S(['uiLocale', 'xx']), '/ /modules /settings'],
  ['startDate "garbage"', S(['startDate', 'garbage']), '/ /settings'],
  ['startDate {object}', S(['startDate', obj]), '/ /settings'],
  ['startDate 2026-13-45', S(['startDate', '2026-13-45']), '/ /settings'],
  ['cadenceDays 1e9 with a start date', S(['cadenceDays', 1e9], ['startDate', '2026-10-01']), '/ /modules'],
  ['criteria "abc"', S(['criteria', 'abc']), '/dreams'],
  ['saboteurs "judge"', S(['saboteurs', 'judge']), '/calm'],
  ['12 unknown saboteurs, strengths null', S(['saboteurs', [...'abcdefghijkl']], ['strengths', null]), '/calm'],
  ['__proto__ and constructor settings', S(['__proto__', { startDate: 'x' }], ['constructor', 1]), '/ /settings'],
  ['Friend role, startDate garbage', S(['role', 'friend'], ['config', 'solo'], ['startDate', 'x']), '/ /friend/01'],
  ['dream text {object}', { dreams: [D({ text: obj })] }, '/ /dreams /dream /book/print/rating'],
  ['dream tags "x", dateAdded garbage', { dreams: [D({ tags: 'x', dateAdded: 'garbage' })] }, '/dreams /dream'],
  ['dream ids "abc", -3, 1.5', { dreams: [D({ id: 'abc' }), D({ id: -3 }), D({ id: 1.5 })] }, '/dreams /dream'],
  ['worksheet habitLog {}', W({ habitLog: {} }), '/dream /book/print/habit'],
  ['worksheet habit week garbage', W({ habitLog: [{ week: 'garbage', done: true }] }), '/dream /book/print/habit'],
  ['worksheet routes 5, friends "x"', W({ routes: 5, friends: 'x' }), '/dream /book/print/clarify /book/print/friends'],
  ['worksheet letgo signs "x"', W({ letgo: { signs: 'oscillate', decision: 'continue', decided: 'zz' } }), '/dream'],
  ['vision values/worksheet null', V({ values: null, worksheet: null }), '/vision'],
  ['vision without valueActs', { vision: [{ id: 'me', values: [], worksheet: {} }] }, '/vision'],
  ['vision sealed letter, delivery garbage', V({ letter: { text: 'x', sealed: true, deliverDate: 'zz' } }), '/vision'],
  ['checkin every 7, log {}', V({ checkin: { everyMonths: 7, log: obj } }), '/vision /book/print/checkin'],
  ['wheel with 3 areas', { wheels: [{ id: 1, values: [1, 2, 3], swls: [1, 1, 1, 1, 1] }] }, '/calm'],
  ['wheel with string scores', { wheels: [{ id: 2, values: Array(8).fill('5'), swls: Array(5).fill('1') }] }, '/calm'],
  ['journal garbage date, saboteur "x"', { journal: [{ id: 1, date: 'x', happened: 'h', saboteur: 'x' }] }, '/calm'],
  ['journal / strength use without text', { journal: [{ id: 2 }], strengthUses: [{ id: 1, date: 'zz' }] }, '/calm'],
  ['plan module "99"', { plans: [{ id: 1, moduleId: '99', condition: 'c', action: 'a', done: 0 }] }, '/friend/01'],
  ['plan condition {object}', { plans: [{ id: 2, moduleId: '01', condition: obj, action: 'a' }] }, '/module/01'],
  ['friend note text {object}', { friendNotes: [{ id: 1, moduleId: '01', text: obj }] }, '/friend/01'],
  ['friend note created garbage', { friendNotes: [{ id: 2, moduleId: '01', text: 't', created: 'zz' }] }, '/friend/01'],
  ['module 42 completed on "x"', { moduleNotes: [{ moduleId: '42', completedOn: 'x' }] }, '/'],
]
{
  const { ctx, page } = await open()
  await onboard(page)
  for (const [name, over, routes] of POISON) {
    const { msg } = await importFile(page, backup(over))
    const broken = []
    for (const r of routes.split(' ')) broken.push(await render(page, r))
    const why = [OK.test(msg) ? '' : `"${msg}"`, ...broken].filter(Boolean).join('; ')
    check(!why, `poison ${name}: imported, ${routes} render${why ? ' — ' + why : ''}`)
  }

  // the rules between rows, and ids
  const three = [D({ chosen: true }), D({ id: 2 }), D({ id: 3, dateReleased: '2026-10-02' })]
  await importFile(page, backup({ dreams: three }))
  const chosen = (await dump(page, ['dreams'])).dreams.map((d) => d.chosen).join()
  check(chosen === '1,0,0', 'chosen: true is read as chosen; one chosen dream at most, never a released one')
  const tasks = [
    { id: 1, text: 'GHOST-TASK', quadrant: 'zzz', moved: 1 },
    { id: 2, text: 'b', quadrant: 'plan', moved: 1 },
  ]
  await importFile(page, backup({ weekTasks: tasks }))
  const moved = (await dump(page, ['weekTasks'])).weekTasks.filter((w) => w.moved === 1).length
  check(moved === 1, 'one task moved to the calendar at most')
  const ghost = (await render(page, '/week')) === null && (await shown(page.getByText('GHOST-TASK')))
  check(ghost, 'a task with an unknown quadrant still shows on #/week')
  const ids = [D({ id: 2 ** 53, text: 'BIG' }), D({ id: 0, text: 'ZERO' }), D({ id: 2, text: 'SMALL' })]
  const { msg: idMsg } = await importFile(page, backup({ dreams: ids }))
  const kept = (await dump(page, ['dreams'])).dreams.map((d) => d.id).join()
  check(/2 rânduri/.test(idMsg) && kept === '2', 'dream ids 2^53 and 0 are dropped, and counted in the message')
  await fresh(page, '/dreams')
  await page.getByLabel('Un vis nou').fill('ADDED-AFTER-IMPORT')
  await page.getByLabel('Un vis nou').press('Enter')
  check(await shown(page.getByText('ADDED-AFTER-IMPORT')), 'a dream can still be added after a file with huge ids')

  // refusals, encodings, size
  check(/nu a putut fi citit/.test((await importFile(page, '{"app":"dream-course",')).msg), 'malformed JSON is refused')
  const notList = (await importFile(page, backup({ dreams: { length: 1 } }))).msg
  check(/nu a putut fi citit/.test(notList), 'dreams as an object is refused')
  const before = JSON.stringify(await dump(page, ['dreamWork']))
  const workObj = (await importFile(page, backup({ dreams: [D({ text: 'NEW' })], dreamWork: {} }))).msg
  const after = JSON.stringify(await dump(page, ['dreamWork']))
  check(/nu a putut fi citit/.test(workObj) && before === after, 'worksheets as an object are refused, nothing changes')
  const huge = Buffer.alloc(21 * 1024 * 1024, 0x20)
  check(/prea mare/.test((await importFile(page, huge)).msg), 'a file over 20 MB is refused as too large')
  const good = JSON.stringify(RECOVERED)
  const bom8 = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(good)])
  check(OK.test((await importFile(page, bom8)).msg), 'a UTF-8 file with a BOM is accepted')
  const bom16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(good, 'utf16le')])
  check(OK.test((await importFile(page, bom16)).msg), 'a UTF-16 file with a BOM is accepted')
  const many = Array.from({ length: 20000 }, (_, i) => D({ id: i + 1, chosen: 0, text: 'v' + i }))
  const t0 = Date.now()
  const { msg: manyMsg } = await importFile(page, backup({ dreams: many }))
  const ms = Date.now() - t0
  check(/5000 visuri/.test(manyMsg) && ms < 15000, `20 000 dreams: capped at 5000 and counted (${ms} ms)`)
  check((await render(page, '/dreams')) === null, '#/dreams renders 5000 dreams')

  // the same file twice: the input is reset, so the second pick asks and imports again
  let asked = 0
  page.on('dialog', (d) => (asked++, d.accept()))
  await fresh(page, '/settings')
  for (let i = 1; i <= 2; i++) {
    const file = { name: 'same.json', mimeType: 'application/json', buffer: Buffer.from(good) }
    await page.locator('input[type=file]').setInputFiles(file)
    for (let t = 0; t < 30 && asked < i; t++) await page.waitForTimeout(100)
    await page.getByText(OK).waitFor()
  }
  page.removeAllListeners('dialog')
  check(asked === 2, 'picking the same file twice imports twice')
  await ctx.close()
}

// ---- 2. the files that bricked every page: the bad setting is left out, the device keeps its own, nothing crashes
const BRICKS = [
  ['88-byte uiLocale file', '{"key":"uiLocale"}'],
  ['startDate file', '{"key":"onboarded","value":1},{"key":"startDate","value":"x"}'],
]
for (const [name, settings] of BRICKS) {
  const { ctx, page } = await open()
  await onboard(page)
  const raw = `{"app":"dream-course","schema":1,"dreams":[],"plans":[],"settings":[${settings}]}`
  await importFile(page, raw, { wait: false })
  const r = await render(page, '/settings')
  check(r === null && !/#\/start/.test(page.url()), `${name}: no crash, the device stays onboarded`)
  check((await render(page, '/')) === null, `${name}: home renders`)
  await ctx.close()
}

// ---- 3. the confirm, kept tables, recovery from a broken page, another tab
{
  const { ctx, page } = await open()
  await onboard(page)
  const seed = backup({
    dreams: [D({ text: 'SEED-DREAM' })],
    dreamWork: [{ dreamId: 1, clarify: { clarity: 'SEED-CLARITY' }, updated: '2026-10-01' }],
    friendNotes: [{ id: 1, moduleId: '01', text: 'KEEP-FRIEND', created: '2026-10-01' }],
    journal: [{ id: 1, date: '2026-10-01', happened: 'KEEP-JOURNAL' }],
  })
  await importFile(page, seed)
  const before = canon(await dump(page))
  const { question, msg } = await importFile(page, RECOVERED, { accept: false })
  check(/înlocuite/.test(question ?? '') && /\(1\)/.test(question ?? ''), 'import asks first, with the dream counts')
  check(!msg && canon(await dump(page)) === before, 'cancelling the confirm changes nothing')
  const { question: q2 } = await importFile(page, backup({ dreams: [D({ text: 'NEW-DREAM' })] }, false))
  const after = await dump(page)
  check(/rămâne/.test(q2 ?? ''), 'the confirm says that what the file lacks stays')
  const keptRows = after.friendNotes[0]?.text === 'KEEP-FRIEND' && after.journal[0]?.happened === 'KEEP-JOURNAL'
  check(keptRows, "tables missing from the file are kept (the Friend's notes, the journal)")
  check(!after.dreamWork.length && after.dreams[0]?.text === 'NEW-DREAM', 'dream worksheets go with the dreams')

  // a row the import never saw (an older version, a bug) breaks one page, not the app
  await page.evaluate(
    () =>
      new Promise((res) => {
        const r = indexedDB.open('dream-course')
        r.onsuccess = () => {
          const tx = r.result.transaction('dreams', 'readwrite')
          tx.objectStore('dreams').put({ id: 1, text: { a: 1 }, dateAdded: '2026-10-01', chosen: 1 })
          tx.oncomplete = () => (r.result.close(), res())
        }
      }),
  )
  const card = (await render(page, '/dreams')) ?? ''
  check(/error card/.test(card), 'a broken page shows the error card, not a blank screen')
  await page.getByRole('alert').getByRole('link', { name: 'Setări' }).click()
  check(await shown(page.locator('input[type=file]'), 'attached'), 'the error card links to Settings')
  const recovered = OK.test((await importFile(page, RECOVERED)).msg) && (await render(page, '/dreams')) === null
  check(recovered && (await shown(page.getByText('RECOVERED-OK'))), 'importing a good copy recovers the page')

  // another tab, still typing in My dream, reloads and writes nothing over the imported data
  await importFile(page, seed)
  const tab = await ctx.newPage()
  await tab.goto(base + '#/dream')
  await tab.locator('#step-clarity').waitFor()
  await tab.evaluate(() => (window.__mark = 1))
  const typing = tab.locator('#step-clarity').pressSequentially('STALE-TAB-TEXT-'.repeat(3), { delay: 60 })
  const imported = [{ dreamId: 1, clarify: { clarity: 'IMPORTED-CLARITY' } }]
  await importFile(page, backup({ dreams: [D({ text: 'IMPORTED' })], dreamWork: imported }))
  await typing.catch(() => {})
  await tab.waitForTimeout(2000)
  check((await tab.evaluate(() => window.__mark).catch(() => 1)) !== 1, 'the other tab reloads after the import')
  const all = canon(await dump(page))
  check(all.includes('IMPORTED-CLARITY') && !all.includes('STALE'), 'its unsaved text is not written')
  check((await tab.locator('#step-clarity').inputValue()) === 'IMPORTED-CLARITY', 'it shows the imported worksheet')
  await ctx.close()
}

// ---- 4. round trip: export through the button, import on a fresh device, every table equal
{
  const routes = ['r1', '', 'r3']
  const rich = backup({
    dreams: [D({ id: 3, text: 'Să navighez 🚀 "x" <b>', area: 'adventure', why: 'intrinsic', score: 9, tags: ['a'] })],
    plans: [{ id: 2, moduleId: '01', condition: 'c', action: 'a', created: '2026-10-01', done: 0 }],
    moduleNotes: [{ moduleId: '01', oneWord: 'curios', takeaways: 'x\ny', completedOn: '2026-10-01' }],
    ...S(['startDate', '2026-10-05'], ['cadenceDays', 21], ['criteria', ['bani']]),
    friendNotes: [{ id: 4, moduleId: '02', text: 'friend note', created: '2026-10-01' }],
    dreamWork: [{ dreamId: 3, clarify: { clarity: 'c1' }, routes, habitLog: [{ week: '2026-10-05', done: true }] }],
    weekTasks: [{ id: 5, text: 't', quadrant: 'plan', moved: 1, created: '2026-10-01' }],
    journal: [{ id: 6, date: '2026-10-01', happened: 'h', saboteur: 'judge' }],
    reps: [{ id: 1, date: '2026-10-01', seconds: 60 }],
    wheels: [{ id: 1, date: '2026-10-01', values: [1, 2, 3, 4, 5, 6, 7, 8], swls: [1, 2, 3, 4, 5] }],
    ...V({ worksheet: { matters: 'm' }, letter: { text: 'dear me', sealed: true, deliverDate: '2027-04-01' } }),
  })
  const A = await open()
  await onboard(A.page)
  check(OK.test((await importFile(A.page, rich)).msg), 'round trip: seed imported')
  await fresh(A.page, '/friend/03')
  await A.page.locator('textarea').first().fill('UI friend note')
  await A.page.getByRole('button', { name: 'Adaugă notița' }).click()
  await A.page.waitForTimeout(400)
  const before = await dump(A.page)
  await fresh(A.page, '/settings')
  const download = A.page.waitForEvent('download')
  await A.page.getByRole('button', { name: 'Salvează o copie' }).click()
  const exported = await readFile(await (await download).path())
  const parsed = JSON.parse(exported.toString('utf8'))
  const everyTable = Object.keys(before).every((t) => Array.isArray(parsed[t]))
  check(everyTable, 'round trip: the export holds every table')
  const B = await open()
  await onboard(B.page)
  check(OK.test((await importFile(B.page, exported)).msg), 'round trip: the export imports on a fresh device')
  const after = await dump(B.page)
  const diff = Object.keys(before).filter((t) => canon(before[t]) !== canon(after[t]))
  check(!diff.length, `round trip: every table equal${diff.length ? ' — differs: ' + diff.join(', ') : ''}`)
  check(!A.page.errors.length && !B.page.errors.length, 'round trip: no console errors')
  await A.ctx.close()
  await B.ctx.close()
}

await browser.close()
console.log(failures ? `\n${failures} failure(s)` : '\nall import checks passed')
process.exit(failures ? 1 : 0)
