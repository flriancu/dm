// Cross-module flows, role/configuration transitions and dates (fake clock, time zones).
// Usage: node e2e/flows.mjs http://localhost:5173/
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173/'
const TZ = 'Europe/Bucharest'
const browser = await chromium.launch()
let failures = 0
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failures++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const visible = async (loc, timeout = 4000) =>
  loc
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(
      () => true,
      () => false,
    )
const errors = []
let dismissDialogs = false

/** A wall-clock time (yyyy-mm-ddThh:mm:ss) in a time zone, as epoch ms. */
function wall(iso, tz = TZ) {
  const d2 = '2-digit'
  const parts = { year: 'numeric', month: d2, day: d2, hour: d2, minute: d2, second: d2, hourCycle: 'h23' }
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, ...parts })
  for (let off = -14 * 60; off <= 14 * 60; off += 15) {
    const t = Date.parse(iso + 'Z') - off * 60000
    const g = Object.fromEntries(fmt.formatToParts(new Date(t)).map((p) => [p.type, p.value]))
    if (`${g.year}-${g.month}-${g.day}T${g.hour}:${g.minute}:${g.second}` === iso) return t
  }
  throw new Error(`no wall time ${iso} in ${tz}`)
}
const prevDay = (iso) => new Date(Date.parse(iso + 'T12:00:00Z') - 864e5).toISOString().slice(0, 10)

/** A fresh browser profile (empty database), optionally with the clock set to a local time. */
async function fresh({ tz = TZ, at } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'ro-RO', timezoneId: tz })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('dialog', (d) => (dismissDialogs ? d.dismiss() : d.accept()))
  if (at) await page.clock.install({ time: wall(at, tz) })
  return { ctx, page }
}
async function finishOnboarding(page) {
  await page.getByRole('button', { name: 'Visător', exact: true }).click()
  await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click()
  await page.getByRole('button', { name: 'Începe' }).click()
}
/** Onboards, then imports a backup built from `tables` and `settings` through Settings (tables left out stay empty). */
async function seed(page, tables = {}, settings = {}) {
  await page.goto(base)
  await page.waitForURL(/#\/start/)
  await finishOnboarding(page)
  await page.waitForURL(/#\/$/)
  const s = { onboarded: true, role: 'dreamer', config: 'solo', uiLocale: 'ro', ...settings }
  const rows = Object.entries(s).map(([key, value]) => ({ key, value }))
  const file = { app: 'dream-course', schema: 1, dreams: [], plans: [], ...tables, settings: rows }
  await page.goto(base + '#/settings')
  const buffer = Buffer.from(JSON.stringify(file))
  await page.locator('input[type=file]').setInputFiles({ name: 'seed.json', mimeType: 'application/json', buffer })
  await page.getByText(/Copia a fost încărcată/).waitFor()
}
const dump = (page, table) =>
  page.evaluate(
    (table) =>
      new Promise((res, rej) => {
        const r = indexedDB.open('dream-course')
        r.onerror = () => rej(r.error)
        r.onsuccess = () => {
          const g = r.result.transaction(table, 'readonly').objectStore(table).getAll()
          g.onsuccess = () => (r.result.close(), res(g.result))
        }
      }),
    table,
  )
const settingsOf = async (page) => Object.fromEntries((await dump(page, 'settings')).map((r) => [r.key, r.value]))
const vision = async (page) => (await dump(page, 'vision'))[0]
const atSection = async (page, id) =>
  page.evaluate((id) => {
    const top = document.getElementById(id)?.getBoundingClientRect().top
    const bottom = Math.ceil(scrollY + innerHeight) >= document.documentElement.scrollHeight - 2
    return top !== undefined && (Math.abs(top) < 60 || (bottom && top > 0))
  }, id)
/** Downloads the calendar file behind a button and checks it against RFC 5545 basics. */
async function checkIcs(page, button, uid, date) {
  const [dl] = await Promise.all([page.waitForEvent('download'), button.click()])
  const chunks = []
  for await (const c of await dl.createReadStream()) chunks.push(c)
  const raw = Buffer.concat(chunks)
  const text = raw.toString('utf8')
  const lines = text.split('\r\n')
  const unfolded = text.replace(/\r\n /g, '').split('\r\n')
  const seq = unfolded.some((l) => /^SEQUENCE:\d+$/.test(l))
  const folded = lines.every((l) => Buffer.byteLength(l) <= 75)
  check(folded, `${uid}.ics: folded at 75 octets`)
  check(text.endsWith('\r\n') && !/[^\r]\n/.test(text), `${uid}.ics: CRLF line ends, CRLF at the end`)
  check(Buffer.from(text, 'utf8').equals(raw), `${uid}.ics: valid UTF-8 (no character split by a fold)`)
  // the purpose plus this device's own id: stable for this person, never mixed with another's
  const uidOk = new RegExp(`UID:${uid}-[A-Za-z0-9_-]{8,}@cartea-visurilor`).test(unfolded)
  check(uidOk && seq, `${uid}.ics: stable UID and a SEQUENCE`)
  check(unfolded.includes(`DTSTART;VALUE=DATE:${date.replace(/-/g, '')}`), `${uid}.ics: DTSTART is ${date}`)
}

// ---- onboarding: a deep link survives it; /start leads on once onboarded
{
  const { ctx, page } = await fresh()
  await page.goto(base + '#/vision?s=letter')
  await page.waitForURL(/#\/start/)
  await finishOnboarding(page)
  await page.waitForURL(/#\/vision\?s=letter$/).then(
    () => check(true, 'onboarding: the deep link opened before it is restored after it'),
    () => check(false, `onboarding: the deep link is restored (got ${page.url()})`),
  )
  await sleep(500)
  check(await atSection(page, 'letter'), 'onboarding: the restored link scrolls to its section')
  const s = await settingsOf(page)
  check(s.onboarded === true && s.friendToday === false, 'onboarding: writes onboarded and friendToday=false')
  await page.goto(base + '#/start')
  await page.waitForURL(/#\/$/, { timeout: 4000 }).then(
    () => check(true, 'onboarding: #/start redirects once onboarded'),
    () => check(false, `onboarding: #/start redirects once onboarded (got ${page.url()})`),
  )
  await ctx.close()
}

// ---- section links (?s=) on the long pages, from a module and from Home
{
  const { ctx, page } = await fresh()
  const past = '2026-01-01'
  const letter = { text: 'scrisoarea', sealed: true, deliverDate: past, sealedOn: '2025-09-01', opened: false }
  await seed(page, {
    dreams: [{ id: 1, text: 'Apuseni pe jos', dateAdded: '2026-10-01', chosen: 1 }],
    vision: [{ id: 'me', values: [], valueActs: [], worksheet: {}, checkin: { everyMonths: 3, next: past }, letter }],
  })
  const pages = {
    '/dream': ['clarify', 'woop', 'habit', 'friends', 'fear', 'letgo'],
    '/vision': ['values', 'letter', 'sheet', 'regret', 'checkin', 'retro'],
    '/calm': ['profile', 'journal', 'rep', 'wheel'],
  }
  for (const [route, ids] of Object.entries(pages)) {
    await page.goto(base + '#' + route)
    const bad = []
    for (const id of ids) {
      await page.locator(`a[href="#${route}?s=${id}"]`).click()
      await sleep(300)
      if (!page.url().endsWith(`#${route}?s=${id}`) || !(await atSection(page, id))) bad.push(id)
    }
    check(bad.length === 0, `section links on ${route} stay on the page and scroll (${bad.join(',') || 'all'})`)
  }
  await page.goto(base + '#/module/03')
  await page.locator('a[href="#/dream?s=woop"]').click()
  await sleep(600)
  check(await atSection(page, 'woop'), 'module 3 tool link lands at the WOOP section')
  for (const [name, id] of [
    ['Deschide verificarea', 'checkin'],
    ['Deschide scrisoarea', 'letter'],
  ]) {
    await page.goto(base + '#/')
    await page.getByRole('link', { name }).click()
    await sleep(600)
    check(await atSection(page, id), `Home "${name}" lands at #${id}`)
  }
  await ctx.close()
}

// ---- the dream lifecycle on My dream
{
  const { ctx, page } = await fresh()
  const today = await page.evaluate(() => new Date().toLocaleDateString('sv'))
  await seed(page, {
    dreams: [
      { id: 1, text: 'Visul A', dateAdded: '2026-09-01', chosen: 1 },
      { id: 2, text: 'Visul B', dateAdded: '2026-09-01', chosen: 0 },
      { id: 3, text: 'Visul C', dateAdded: '2026-09-01', chosen: 0, dateReleased: today },
    ],
    dreamWork: [
      { dreamId: 1, letgo: { costs: 'costuri A' }, habit: { anchor: 'ancora A' } },
      { dreamId: 3, letgo: { costs: 'costuri C' } },
    ],
  })
  const head = () => page.locator('.card.soft').first().textContent()
  await page.goto(base + '#/dream')
  await page.getByRole('button', { name: 'Las visul' }).click()
  check(await visible(page.getByText(/Visul a fost lăsat pe/)), 'My dream: "Las visul" shows the letting-go note')
  check(
    (await head()).includes('Visul A') && (await page.locator('#letgo-costs').inputValue()) === 'costuri A',
    'My dream: the released dream stays shown (not the one released earlier the same day)',
  )
  const prints = await page.locator('a[href*="#/book/print/"]').evaluateAll((as) => as.map((a) => a.href))
  check(prints.length >= 5 && prints.every((h) => h.endsWith('?dream=1')), 'My dream: print links name the dream')
  await page.goto(base + '#/book/print/habit?dream=1')
  check(await visible(page.getByText('ancora A')), 'print sheet with ?dream= prints the released dream')
  await page.goto(base + '#/dream')
  check(await visible(page.getByText(/Încă nu ai ales un vis la care lucrezi/)), 'My dream: a later visit shows "none"')
  // text typed for one dream never lands on the next (another tab chooses B mid-typing)
  await page.goto(base + '#/dreams')
  await page.getByText('Visul B', { exact: true }).click()
  await page.getByRole('button', { name: /Aleg acest vis/ }).click()
  const other = await ctx.newPage()
  await other.goto(base + '#/dreams')
  await other.getByText('Visul A', { exact: true }).click()
  await page.goto(base + '#/dream')
  const box = page.getByLabel(/^Obstacolul/)
  await box.click()
  await box.pressSequentially('obstacolul lui B', { delay: 5 })
  await other.getByText('Visul C', { exact: true }).click()
  await other.getByText('Visul A', { exact: true }).click() // closes C, keeps A open
  await other.reload()
  await other.getByText('Visul B', { exact: true }).click()
  await other.getByRole('button', { name: 'Marchează ca împlinit' }).click()
  await sleep(1200)
  const work = await dump(page, 'dreamWork')
  check(work.find((w) => w.dreamId === 2)?.woop?.obstacle === 'obstacolul lui B', 'typed text is saved on its dream')
  check((await head()).includes('Visul B'), 'My dream: a dream achieved in another tab stays shown until leaving')
  await ctx.close()
}

// ---- paper mode: rename, empty = un-choose, type again = a new chosen dream
{
  const { ctx, page } = await fresh()
  await seed(
    page,
    {
      dreams: [{ id: 1, text: 'Visul A', dateAdded: '2026-09-01', chosen: 1 }],
      dreamWork: [{ dreamId: 1, woop: { wish: 'dorinta A' } }],
    },
    { paperMode: true },
  )
  await page.goto(base + '#/dreams')
  const box = page.locator('#paper-chosen')
  await page.waitForFunction(() => document.querySelector('#paper-chosen')?.value === 'Visul A')
  const dreams = () => dump(page, 'dreams')
  await box.fill('Visul A, corectat')
  await box.blur()
  await sleep(300)
  check((await dreams())[0].text === 'Visul A, corectat', 'paper: editing renames the chosen dream')
  await box.fill('')
  await box.blur()
  await sleep(300)
  let ds = await dreams()
  check(!ds.some((d) => d.chosen) && ds[0].text === 'Visul A, corectat', 'paper: emptying un-chooses, text kept')
  await box.pressSequentially('Visul D din caiet ', { delay: 40 })
  await sleep(900)
  ds = await dreams()
  const d = ds.find((x) => x.chosen)
  check(ds.length === 2 && d?.id !== 1 && d?.text === 'Visul D din caiet ', 'paper: typing again adds one new dream')
  check((await box.inputValue()) === 'Visul D din caiet ', 'paper: no trimming while typing')
  check(!(await dump(page, 'dreamWork')).some((w) => w.dreamId === d?.id), 'paper: the new dream inherits nothing')
  await ctx.close()
}

// ---- the letter: draft -> sealed -> arrived (midnight, Home open) -> read -> a new letter
{
  const { ctx, page } = await fresh({ at: '2026-08-31T12:00:00' })
  await seed(page)
  await page.goto(base + '#/vision')
  await page.locator('#letter-text').fill('Dragă eu, ești pe prispa casei; ai învățat să navighezi.')
  await page.locator('#letter-reply').fill('Mă bucur.')
  await page.locator('#letter-reply').blur()
  await page.getByRole('button', { name: 'Sigilez scrisoarea' }).click()
  check(await visible(page.getByText(/Sigilată până pe/)), 'letter: sealed')
  const { deliverDate } = (await vision(page)).letter
  check(deliverDate === '2027-02-28', `letter: default delivery in 6 months, month end clamped (${deliverDate})`)
  await checkIcs(page, page.getByRole('button', { name: 'Pune data în calendar' }), 'letter', deliverDate)
  await page.goto(base + '#/book/print/letter')
  await page.locator('.sheet').first().waitFor()
  check(!(await visible(page.getByText('prispa casei'), 500)), 'letter: hidden in print while sealed')
  // time only moves forward from here: Home's midnight timer is set after the clock is
  await page.clock.setSystemTime(wall(`${prevDay(deliverDate)}T23:59:30`))
  await page.goto(base + '#/')
  await page.reload()
  await page.getByRole('heading', { name: 'Visul la care lucrez' }).waitFor()
  const due = page.getByText('Scrisoarea de la tine din viitor te așteaptă')
  check(!(await visible(due, 500)), 'letter: no Home card the evening before')
  await page.clock.runFor(60_000)
  check(await visible(due), 'letter: the Home card appears at midnight with Home open')
  await page.clock.setFixedTime(wall(`${deliverDate}T09:00:00`))
  await page.getByRole('link', { name: 'Deschide scrisoarea' }).click()
  check(await visible(page.locator('.letter-text', { hasText: 'prispa casei' })), 'letter: arrived, shown')
  check((await page.locator('#letter-text').count()) === 0, 'letter: arrived letter is read-only')
  check(await visible(page.locator('#letter-reply')), 'letter: arrived letter has the reply box')
  await page.goto(base + '#/book/print/letter')
  check(await visible(page.getByText('prispa casei')), 'letter: printable once its date came')
  await page.goto(base + '#/vision?s=letter')
  await page.getByRole('button', { name: 'Am citit scrisoarea' }).click()
  check(await visible(page.getByText(/Citită pe/)), 'letter: read')
  check((await vision(page)).letter.openedOn === deliverDate, 'letter: openedOn stored')
  await page.goto(base + '#/')
  await page.getByRole('heading', { name: 'Visul la care lucrez' }).waitFor()
  check(!(await visible(due, 500)), 'letter: Home card gone once read')
  await page.clock.setFixedTime(wall(`${deliverDate}T09:00:00`) + 40 * 864e5)
  await page.goto(base + '#/vision')
  dismissDialogs = true
  await page.getByRole('button', { name: 'Scriu o scrisoare nouă' }).click()
  dismissDialogs = false
  check(await visible(page.getByText(/Citită pe/)), 'letter: a cancelled "new letter" keeps the read one')
  await page.getByRole('button', { name: 'Scriu o scrisoare nouă' }).click()
  check(await visible(page.locator('#letter-text')), 'letter: a new letter starts empty')
  const v = await vision(page)
  check(v.pastLetters?.length === 1 && v.pastLetters[0].text.includes('prispa'), 'letter: the old one is kept')
  await page.locator('#letter-text').fill('A doua scrisoare')
  await page.locator('#letter-text').blur()
  await page.locator('#letter-date').click()
  await page.locator('.datepop button:not([disabled])').filter({ hasText: /^\d+$/ }).last().click()
  await page.getByRole('button', { name: 'Sigilez scrisoarea' }).click()
  check(await visible(page.getByText(/Sigilată până pe/)), 'letter: the new letter seals again')
  await ctx.close()
}

// ---- meetings in a peer pair: held once, the lead passes for the next meeting only, undo
{
  const { ctx, page } = await fresh({ at: '2026-10-13T10:00:00' })
  const settings = { role: 'both', config: 'pair', friendToday: false, startDate: '2026-09-01' }
  await seed(page, { moduleNotes: [{ moduleId: '00', completedOn: '2026-09-01' }] }, settings)
  const lead = async () => (await settingsOf(page)).friendToday
  const held = (id) => page.goto(base + '#/module/' + id).then(() => page.getByRole('heading', { level: 1 }).waitFor())
  await held('01')
  await page.getByRole('button', { name: 'Întâlnirea a avut loc', exact: true }).dblclick()
  await sleep(400)
  check((await lead()) === true, 'meeting: a double click passes the lead once')
  check(await visible(page.getByText(/✓ Întâlnirea a avut loc · 13 octombrie 2026/)), 'meeting: held, with its date')
  await page.getByRole('button', { name: 'Nu a avut loc încă' }).click()
  await sleep(300)
  check((await lead()) === false, 'meeting: undo passes the lead back')
  await page.clock.setFixedTime(wall('2026-10-14T10:00:00'))
  await page.getByRole('button', { name: 'Întâlnirea a avut loc', exact: true }).click()
  await sleep(300)
  const note = (await dump(page, 'moduleNotes')).find((n) => n.moduleId === '01')
  check((await lead()) === true && note.completedOn === '2026-10-14', 'meeting: re-marked after undo')
  await held('05')
  await page.getByRole('button', { name: 'Întâlnirea a avut loc', exact: true }).click()
  await sleep(300)
  check((await lead()) === true, 'meeting: marking out of order keeps the lead')
  await held('02')
  await page.getByRole('button', { name: 'Întâlnirea a avut loc', exact: true }).click()
  await sleep(300)
  check((await lead()) === false, 'meeting: then marking the next one passes it')
  await page.goto(base + '#/')
  check(await visible(page.getByText('La această întâlnire conduce celălalt.')), 'meeting: Home shows who leads')
  await ctx.close()
}

// ---- the check-in rhythm; local dates at +14 and -11
{
  const { ctx, page } = await fresh({ at: '2027-01-20T10:00:00' })
  const checkin = { everyMonths: 3, next: '2027-01-13' }
  await seed(page, { vision: [{ id: 'me', values: [], valueActs: [], worksheet: {}, checkin }] })
  await page.goto(base + '#/vision?s=checkin')
  await page.getByText(/E timpul pentru verificarea viziunii\. Rezervă/).waitFor()
  const calendar = page.getByRole('button', { name: 'Pune data în calendar' })
  check((await calendar.count()) === 0, 'check-in: no calendar file for a past date')
  for (const m of ['la 6 luni', 'la 3 luni', 'la 6 luni']) await page.getByRole('button', { name: m }).click()
  await sleep(300)
  let c = (await vision(page)).checkin
  check(c.next === '2027-01-13' && c.everyMonths === 6, 'check-in: changing the rhythm keeps a due check-in due')
  await page.locator('#checkin-note').fill('roata a crescut')
  await page.getByRole('button', { name: 'Am făcut verificarea de azi' }).click()
  await sleep(300)
  c = (await vision(page)).checkin
  check(c.next === '2027-07-20' && c.lastDone === '2027-01-20' && c.log?.length === 1, 'check-in: logged, +6 months')
  await page.getByRole('button', { name: 'la 3 luni' }).click()
  await sleep(300)
  check((await vision(page)).checkin.next === '2027-04-20', 'check-in: a new rhythm counts from the last check-in')
  await checkIcs(page, calendar, 'checkin', '2027-04-20')
  await ctx.close()
  for (const tz of ['Pacific/Kiritimati', 'Pacific/Pago_Pago']) {
    const { ctx, page } = await fresh({ tz, at: '2026-08-31T23:30:00' })
    await seed(page)
    await page.goto(base + '#/vision?s=checkin')
    await page.getByRole('button', { name: 'la 3 luni' }).click()
    await sleep(300)
    check((await vision(page)).checkin?.next === '2026-11-30', `check-in in ${tz}: counts from the local date`)
    await ctx.close()
  }
}

// ---- midnight with My dream open: the habit week moves on
{
  const { ctx, page } = await fresh({ at: '2026-10-18T12:00:00' })
  await seed(page, { dreams: [{ id: 1, text: 'X', dateAdded: '2026-10-01', chosen: 1 }] })
  await page.clock.setSystemTime(wall('2026-10-18T23:59:40'))
  await page.goto(base + '#/dream?s=habit')
  await page.reload()
  const week = page.getByText(/Săptămâna din .*săptămâna aceasta/).first()
  check(/12 octombrie/.test(await week.textContent()), 'habit: Sunday evening, this week is 12 October')
  await page.clock.runFor(30_000)
  await page.waitForFunction(() => /19 octombrie[^]*săptămâna aceasta/.test(document.body.innerText)).catch(() => {})
  check(/19 octombrie/.test(await week.textContent()), 'habit: after midnight, this week is 19 October')
  await page.locator('label:has-text("săptămâna aceasta") input[type=checkbox]').check()
  await sleep(300)
  const log = (await dump(page, 'dreamWork'))[0]?.habitLog ?? []
  const ticked = log.some((w) => w.week === '2026-10-19' && w.done)
  check(ticked, 'habit: a tick after midnight goes to the new week')
  await ctx.close()
}

check(errors.length === 0, `no console or page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`)
await browser.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nall flow checks passed')
process.exit(failures ? 1 : 0)
