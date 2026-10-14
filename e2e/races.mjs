// Races and resilience: type-then-tap, flush on leaving or hiding a page, steady typing, double clicks, two tabs on
// the same lists, wipe/import with another tab open, a full disk, the stepper, a page whose code fails to load.
// Usage: node e2e/races.mjs http://localhost:5173/
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch()
let failures = 0
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failures++
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const json = (x) => JSON.stringify(x)

async function onboard(page) {
  await page.goto(base)
  await page.waitForURL(/#\/start/)
  await page.getByRole('button', { name: 'Visător', exact: true }).click()
  await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click()
  await page.getByRole('button', { name: 'Începe' }).click()
  await page.waitForURL(/#\/$/)
}
/** A fresh browser profile (phone size), onboarded as a Dreamer in a pair. */
async function fresh(opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'ro-RO', ...opts })
  const page = await ctx.newPage()
  await onboard(page)
  return { ctx, page }
}
/** All rows of a table, read straight from IndexedDB (not through the app). */
const dump = (page, table) =>
  page.evaluate(
    (table) =>
      new Promise((res, rej) => {
        const r = indexedDB.open('dream-course')
        r.onerror = () => rej(r.error)
        r.onsuccess = () => {
          const d = r.result
          if (!d.objectStoreNames.contains(table)) return (d.close(), res([]))
          const g = d.transaction(table).objectStore(table).getAll()
          g.onsuccess = () => (d.close(), res(g.result))
        }
      }),
    table,
  )
const setting = async (page, key) => (await dump(page, 'settings')).find((r) => r.key === key)?.value
const vision = async (page) => (await dump(page, 'vision'))[0]
const notes01 = async (page) => (await dump(page, 'moduleNotes')).find((n) => n.moduleId === '01')?.takeaways
const count = async (page, table) => (await dump(page, table)).length
async function chooseNewDream(page, text) {
  await page.goto(base + '#/dreams')
  await page.getByLabel('Un vis nou').fill(text)
  await page.getByLabel('Un vis nou').press('Enter')
  await page.getByText(text, { exact: true }).click()
  await page.getByRole('button', { name: /Aleg acest vis/ }).click()
  await sleep(200)
}
/** Every IndexedDB write fails as on a full disk (on), or works again (off). */
const quota = (page, on) =>
  page.evaluate((on) => {
    window.__idb ??= { put: IDBObjectStore.prototype.put, add: IDBObjectStore.prototype.add }
    const full = () => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    }
    IDBObjectStore.prototype.put = on ? full : window.__idb.put
    IDBObjectStore.prototype.add = on ? full : window.__idb.add
  }, on)
const banner = (page) => page.getByRole('alert').filter({ hasText: 'nu s-a salvat' }).count()
const stars = (page) => page.getByRole('button', { name: 'Una din cele cinci' })
const habitNote = (page) => page.getByLabel(/^Propoziția trimisă partenerului/).first()
const habitBox = (page) => page.locator('.field', { has: habitNote(page) }).locator('input[type=checkbox]')
const roleChip = (page) => page.locator('.card', { has: page.locator('#friend-name-0') }).locator('button.chip')
async function alertText(page) {
  const card = page.getByRole('alert')
  await card.waitFor({ timeout: 8000 }).catch(() => {})
  return (await card.count()) ? card.innerText() : ''
}
/** A person's double click: two clicks at the same spot 120 ms apart; the second hits whatever is there by then. */
async function humanDouble(page, loc) {
  await loc.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  const b = await loc.boundingBox()
  for (let i = 0; i < 2; i++) {
    await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
    await sleep(120)
  }
}

// ---- type, then tap a chip in the same row at once (phone): both the text and the tap are kept
{
  const { ctx, page } = await fresh({ hasTouch: true, isMobile: true })
  await page.goto(base + '#/vision')
  await page.getByLabel('Valoarea 1', { exact: true }).tap()
  await page.keyboard.type('libertate', { delay: 40 })
  await stars(page).first().tap()
  await sleep(700)
  const item = (await vision(page)).values[0]
  check(item.text === 'libertate' && item.chosen, `values: type, then tap the star -> ${json(item)}`)
  await chooseNewDream(page, 'vis')
  await page.goto(base + '#/dream')
  await page.locator('#friend-name-0').tap()
  await page.keyboard.type('Ana', { delay: 40 })
  await roleChip(page).first().tap()
  await habitNote(page).tap()
  await page.keyboard.type('am scris luni', { delay: 40 })
  await habitBox(page).tap()
  await sleep(900)
  const { friends, habitLog } = (await dump(page, 'dreamWork'))[0]
  check(friends?.[0]?.name === 'Ana' && !!friends[0].role, `friends: name, then role chip -> ${json(friends?.[0])}`)
  check(habitLog?.[0]?.note === 'am scris luni' && habitLog[0].done, `habit: note, then checkbox -> ${json(habitLog)}`)
  await ctx.close()
}

// ---- text typed < 500 ms ago is saved when the page is left in the app, hidden, or about to be unloaded
{
  const { ctx, page } = await fresh()
  const typeNote = async (p, text) => {
    await p.goto(base + '#/module/01')
    await p.locator('#mine').click()
    await p.keyboard.press('Control+A')
    await p.keyboard.type(text)
  }
  const leave = {
    'a nav link is tapped': (p) => p.getByRole('link', { name: 'Acasă' }).first().click(),
    'the page gets pagehide': (p) => p.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide'))),
    'five pages open in 75 ms': (p) =>
      p.evaluate(async () => {
        for (const h of ['#/vision', '#/calm', '#/module/02', '#/dreams', '#/']) {
          location.hash = h
          await new Promise((r) => setTimeout(r, 15))
        }
      }),
  }
  for (const [how, go] of Object.entries(leave)) {
    await typeNote(page, how)
    await go(page)
    await sleep(700)
    check((await notes01(page)) === how, `flush right after typing when ${how}`)
  }
  await typeNote(page, 'aplicatia trece in fundal')
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await sleep(200)
  await page.close()
  const p2 = await ctx.newPage()
  await p2.goto(base + '#/settings')
  check((await notes01(p2)) === 'aplicatia trece in fundal', 'flush when the page is hidden, then the tab is closed')

  // steady typing, never a 500 ms pause: still saved every ~2 s
  await p2.goto(base + '#/vision')
  await p2.locator('#letter-text').click()
  const typing = p2.keyboard.type('Draga eu din viitor, scriu fara nicio pauza lunga intre taste.', { delay: 110 })
  const stored = async () => ((await vision(p2))?.letter?.text ?? '').length
  await sleep(2700)
  const early = await stored()
  await sleep(2400)
  const later = await stored()
  await typing
  check(early > 0 && later > early, `steady typing is saved as it goes (${early}, then ${later} chars)`)
  await ctx.close()
}

// ---- double clicks add once
{
  const { ctx, page } = await fresh()
  await page.goto(base + '#/dreams')
  await page.getByLabel('Un vis nou').fill('vis dublu')
  await page.getByRole('button', { name: 'Adaugă visul' }).dblclick()
  await page.getByLabel('Un vis nou').fill('vis dublu 2')
  await humanDouble(page, page.getByRole('button', { name: 'Adaugă visul' }))
  await sleep(300)
  check((await count(page, 'dreams')) === 2, `add dream, fast and human double click: ${await count(page, 'dreams')}/2`)
  await page.goto(base + '#/week')
  await page.getByLabel('Un lucru pe care îl fac').fill('sarcina')
  await page.getByRole('button', { name: 'Adaugă lucrul' }).dblclick()
  await page.goto(base + '#/module/01')
  await page.locator('#plan-if').fill('daca ploua')
  await page.locator('#plan-then').fill('citesc')
  await page.getByRole('button', { name: 'Salvează', exact: true }).dblclick()
  await page.goto(base + '#/calm')
  await page.getByRole('button', { name: 'Scriu o întâmplare' }).click()
  await page.getByLabel('Ce s-a întâmplat').fill('m-am enervat')
  await page.getByRole('button', { name: 'Salvează întâmplarea' }).dblclick()
  await page.locator('#use-text').fill('am fost curios')
  await page.getByRole('button', { name: 'Adaugă ziua' }).dblclick()
  const groups = page.locator('[role=radiogroup]')
  for (let i = 0; i < 5; i++) await groups.nth(i).getByRole('button', { name: '4', exact: true }).click()
  await page.getByRole('button', { name: 'Salvează fotografia de azi' }).dblclick()
  await page.goto(base + '#/vision')
  await page.locator('#act-text').fill('am spus nu')
  await humanDouble(page, page.getByRole('button', { name: 'Adaugă lucrul făcut' }))
  await page.getByRole('button', { name: 'la 3 luni' }).click()
  await page.locator('#checkin-note').fill('verificare')
  await page.getByRole('button', { name: 'Am făcut verificarea de azi' }).dblclick()
  await sleep(400)
  const v = await vision(page)
  const tables = ['weekTasks', 'plans', 'journal', 'strengthUses', 'wheels']
  const n = [...(await Promise.all(tables.map((t) => count(page, t)))), v.valueActs.length, v.checkin.log.length]
  check(n.join() === '1,1,1,1,1,1,1', `${tables.join(', ')}, value act, check-in: ${n.join(', ')} rows`)
  await ctx.close()
}

// ---- two tabs edit the same lists at the same moment: nothing is lost, at most five values, one chosen dream
{
  const { ctx, page: A } = await fresh()
  const B = await ctx.newPage()
  await Promise.all([A.goto(base + '#/vision'), B.goto(base + '#/vision')])
  await A.getByLabel('Valoarea 1', { exact: true }).fill('curaj')
  await B.getByLabel('Valoarea 2', { exact: true }).fill('familie')
  await Promise.all([A.getByLabel('Valoarea 1', { exact: true }).blur(), stars(B).nth(1).click()])
  await A.locator('#act-text').fill('act A')
  await B.locator('#act-text').fill('act B')
  await Promise.all([A.locator('#act-text').press('Enter'), B.locator('#act-text').press('Enter')])
  await sleep(800)
  let v = await vision(A)
  const [v1, v2] = v.values
  check(v1.text === 'curaj' && v2.text === 'familie' && v2.chosen, `two tabs, values 1 and 2: ${json([v1, v2])}`)
  check(v.valueActs.length === 2, `two tabs add a value act at once: ${v.valueActs.length}/2 kept`)
  for (let i = 3; i <= 6; i++) {
    await A.getByLabel(`Valoarea ${i}`, { exact: true }).fill(`v${i}`)
    await A.getByLabel(`Valoarea ${i}`, { exact: true }).blur()
  }
  for (const i of [0, 2, 3]) await stars(A).nth(i).click()
  await sleep(800)
  const tap = (p, i) => p.evaluate((i) => document.querySelectorAll('[aria-label="Una din cele cinci"]')[i].click(), i)
  await Promise.all([tap(A, 5), tap(B, 4)])
  await sleep(800)
  v = await vision(A)
  const chosenValues = v.values.filter((x) => x.chosen).length
  check(chosenValues === 5, `two tabs star the 5th and the 6th value at once: ${chosenValues} chosen`)
  await A.goto(base + '#/dreams')
  for (const d of ['unu', 'doi']) {
    await A.getByLabel('Un vis nou').fill(d)
    await A.getByLabel('Un vis nou').press('Enter')
  }
  await B.goto(base + '#/dreams')
  await A.getByText('unu', { exact: true }).click()
  await B.getByText('doi', { exact: true }).click()
  const choose = (p) => p.getByRole('button', { name: /Aleg acest vis/ }).click()
  await Promise.all([choose(A), choose(B)])
  await sleep(500)
  const chosen = (await dump(A, 'dreams')).filter((d) => d.chosen === 1).length
  check(chosen === 1, `two tabs choose different dreams at once: ${chosen} chosen`)
  await ctx.close()
}

// ---- wipe and import while another tab holds unsaved text: that text never lands in the new data
{
  const { ctx, page: A } = await fresh()
  const B = await ctx.newPage()
  await B.goto(base + '#/module/01')
  await B.locator('#mine').click()
  await B.keyboard.type('B scrie ceva')
  await A.goto(base + '#/settings')
  A.once('dialog', (d) => d.accept())
  await A.getByRole('button', { name: /Șterge toate datele/ }).click()
  await A.waitForURL(/#\/start/)
  await sleep(1500)
  const left = (await count(A, 'moduleNotes')) + (await count(A, 'settings'))
  const bAt = B.url().replace(/.*#/, '#')
  check(left === 0 && bAt === '#/start', `wipe with another tab typing: ${left} rows left, other tab at ${bAt}`)
  await onboard(A)
  const settings = await dump(A, 'settings')
  await B.goto(base + '#/vision')
  await B.getByLabel('Valoarea 3', { exact: true }).click()
  await B.keyboard.type('scris in B')
  const values = [{ text: 'din copie', chosen: true }]
  const vision1 = { id: 'me', values, valueActs: [], worksheet: {}, updated: '2026-01-01' }
  const file = { app: 'dream-course', schema: 1, exportedAt: '2026-01-01', dreams: [], plans: [], settings }
  await A.goto(base + '#/settings')
  A.once('dialog', (d) => d.accept())
  const buffer = Buffer.from(json({ ...file, vision: [vision1] }))
  await A.locator('input[type=file]').setInputFiles({ name: 'b.json', mimeType: 'application/json', buffer })
  await sleep(1500)
  const texts = (await vision(A)).values.map((x) => x.text).filter(Boolean)
  check(json(texts) === '["din copie"]', `import with another tab typing: values ${json(texts)}`)
  await ctx.close()
}

// ---- a full disk: the text stays, the box is marked, the banner shows; text in an add form comes back
{
  const { ctx, page } = await fresh()
  await page.goto(base + '#/module/01')
  await quota(page, true)
  const box = page.locator('#mine')
  await box.fill('text care nu se poate salva')
  await box.blur()
  await sleep(500)
  const marked = [await box.inputValue(), await box.getAttribute('class'), await box.getAttribute('aria-invalid')]
  const shown = json([...marked, await banner(page)])
  check(shown === '["text care nu se poate salva","unsaved","true",1]', `full disk: box, mark, banner -> ${shown}`)
  await quota(page, false)
  await box.click()
  await page.keyboard.press('End')
  await page.keyboard.type('!')
  await box.blur()
  await sleep(500)
  const after = [await notes01(page), await box.getAttribute('class')]
  check(after[0] === 'text care nu se poate salva!' && !after[1], `space back: next edit saves, mark cleared`)
  await page.goto(base + '#/dreams')
  await quota(page, true)
  await page.getByLabel('Un vis nou').fill('vis important')
  await page.getByLabel('Un vis nou').press('Enter')
  await sleep(400)
  const back = await page.getByLabel('Un vis nou').inputValue()
  check(back === 'vis important', `full disk: the dream that could not be added is back in its box (${json(back)})`)
  await ctx.close()
}

// ---- the stepper: two digits can be typed, the wheel does nothing, arrows step
{
  const { ctx, page } = await fresh()
  const typeOver = async (box, keys) => {
    await box.click()
    await page.keyboard.press('Control+A')
    await page.keyboard.type(keys, { delay: 60 })
    await sleep(300)
  }
  await page.goto(base + '#/settings')
  const cd = page.locator('#cd')
  await typeOver(cd, '21')
  const typed = [await cd.inputValue(), await setting(page, 'cadenceDays')]
  check(json(typed) === '["21",21]', `stepper: type 21 -> shows, stores ${json(typed)}`)
  await cd.hover()
  await page.mouse.wheel(0, -400)
  await page.keyboard.press('ArrowUp')
  await cd.blur()
  await sleep(300)
  check((await cd.inputValue()) === '22', `stepper: wheel ignored, ArrowUp steps -> ${await cd.inputValue()}`)
  await page.getByRole('checkbox', { name: /Țin lista de visuri pe hârtie/ }).check()
  await page.goto(base + '#/dreams')
  await typeOver(page.locator('#pc'), '5')
  await page.locator('#pc').blur()
  const pc = [await page.locator('#pc').inputValue(), await setting(page, 'paperCount')]
  check(json(pc) === '["5",5]', `paper count: type 5 -> shows, stores ${json(pc)}`)
  await ctx.close()
}

// ---- a page's code fails to load: one reload (a new version), then a card under the nav; offline says so
{
  const { ctx, page } = await fresh()
  let loads = 0
  page.on('load', () => loads++)
  await page.route(/\/(assets\/Calm-[^/]+\.js|src\/pages\/Calm\.tsx)(\?.*)?$/, (r) => r.fulfill({ status: 404 }))
  await page.evaluate(() => (location.hash = '#/calm'))
  const card = /nu a putut fi afișată/.test(await alertText(page))
  const nav = await page.locator('nav a').count()
  check(loads === 1 && card && nav > 0, `missing page code: ${loads} reload, then the card (${card}), nav (${nav})`)
  await page.evaluate(() => (location.hash = '#/'))
  await sleep(600)
  check(!(await page.getByRole('alert').count()), 'missing page code: the other pages open without a reload')
  await ctx.close()

  const { ctx: c2, page: p2 } = await fresh()
  await p2.getByText('Înainte de prima').first().waitFor()
  let reloads = 0
  p2.on('load', () => reloads++)
  await c2.setOffline(true)
  await p2.evaluate(() => (location.hash = '#/vision'))
  const off = await alertText(p2)
  check(/nu aibă internet/.test(off) && reloads === 0, `offline, a page not opened yet: ${json(off.slice(0, 50))}`)
  await c2.close()
}

// ---- the second round: criteria ✕, a person's double click, a full disk on a tap, a reload right after typing, no storage
{
  const { ctx, page } = await fresh()
  await page.goto(base + '#/dreams')
  await page.locator('summary', { hasText: 'Criteriile mele' }).click()
  for (const c of ['A', 'B', 'C']) {
    await page.getByLabel('Adaugă criteriul').fill(c)
    await page.getByLabel('Adaugă criteriul').press('Enter')
  }
  await page.getByRole('button', { name: 'Șterge' }).first().dblclick()
  await sleep(400)
  const criteria = json(await setting(page, 'criteria'))
  check(criteria === '["B","C"]', `a double click on ✕ deletes one criterion -> ${criteria}`)
  await page.goto(base + '#/calm')
  const groups = page.locator('[role=radiogroup]')
  for (let i = 0; i < 5; i++) await groups.nth(i).getByRole('button', { name: '4', exact: true }).click()
  await humanDouble(page, page.getByRole('button', { name: 'Salvează fotografia de azi' }))
  await sleep(400)
  const wheels = await count(page, 'wheels')
  check(wheels === 1, `a person's double click on the wheel save -> ${wheels} snapshots`)
  await chooseNewDream(page, 'vis')
  await page.goto(base + '#/dream')
  await quota(page, true)
  await habitBox(page).check()
  await sleep(500)
  check((await banner(page)) === 1, 'a full disk on the habit checkbox shows the banner')
  await quota(page, false)
  await page.goto(base + '#/module/01')
  await page.locator('#mine').waitFor()
  // a slow phone: at 6x CPU the save cannot finish before the page goes; the journal carries it to the next start
  const cdp = await ctx.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })
  await page.locator('#mine').click()
  await page.keyboard.type('chiar inainte de reincarcare')
  let asked = false
  page.once('dialog', (d) => {
    asked = true
    d.accept()
  })
  await page.reload()
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await page.locator('#mine').waitFor()
  const kept = await notes01(page)
  check(
    !asked && kept === 'chiar inainte de reincarcare',
    `text typed < 500 ms before a reload, at 6x CPU, is kept without asking (asked: ${asked}, kept: ${json(kept)})`,
  )
  await ctx.close()
  const c3 = await browser.newContext()
  await c3.addInitScript(() => Object.defineProperty(window, 'indexedDB', { value: undefined }))
  const p3 = await c3.newPage()
  await p3.goto(base)
  await sleep(2000)
  check(/nu lasă aplicația/.test(await p3.evaluate(() => document.body.innerText)), 'blocked storage shows its message')
  await c3.close()
}

await browser.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nall race checks passed')
process.exit(failures ? 1 : 0)
