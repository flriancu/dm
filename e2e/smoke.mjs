// Smoke test against `vite preview` (acceptance criteria 1, 4, 4a, 5 in part).
// Usage: node e2e/smoke.mjs http://localhost:4173/
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:4173/'
mkdirSync('e2e/shots', { recursive: true })
const browser = await chromium.launch()
let failures = 0
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++ }
// Wait up to 5 s for a locator to be visible; lazy routes render after navigation settles.
const visible = async (loc) => loc.first().waitFor({ state: 'visible', timeout: 5000 }).then(() => true, () => false)

for (const [name, viewport] of [['phone', { width: 360, height: 740 }], ['laptop', { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport, locale: 'ro-RO' })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  // Onboarding
  await page.goto(base)
  await page.waitForURL(/#\/start/)
  check(await visible(page.getByText('Bun venit')), `${name}: onboarding shown in Romanian`)
  check(!(await page.getByRole('button', { name: 'Pereche de egali' }).isVisible()), `${name}: configurations hidden until a role is chosen`)
  await page.getByRole('button', { name: 'Ambele' }).click()
  check(!(await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).isVisible()), `${name}: solo configuration not offered for role Both`)
  await page.getByRole('button', { name: 'Pereche de egali' }).click()
  await page.getByRole('button', { name: 'Începe' }).click()
  await page.waitForURL(/#\/$/)
  check(await visible(page.getByText('Următoarea întâlnire')), `${name}: home after onboarding`)
  check(await visible(page.getByText('Modulul 1: Visează din nou')), `${name}: next meeting is module 1`)
  await page.screenshot({ path: `e2e/shots/${name}-home.png`, fullPage: true })

  // No horizontal scroll (NFR-02)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  check(!overflow, `${name}: no horizontal scroll on home`)

  // Dreams: add, score, tag, choose
  await page.goto(base + '#/dreams')
  const input = page.getByLabel('Un vis nou')
  for (const d of ['Să învăț să navighez', 'Un ceas scump', 'O casă la munte']) { await input.fill(d); await input.press('Enter') }
  check(await visible(page.getByText('3 din 100')), `${name}: three dreams counted`)
  await page.getByText('Să învăț să navighez').click()
  await page.getByLabel(/^Importanță/).fill('9')
  await page.getByRole('button', { name: 'din interior' }).click()
  await page.getByRole('button', { name: /Aleg acest vis/ }).click()
  check(await visible(page.getByText('Visul la care lucrez')), `${name}: a dream can be chosen`)
  await page.screenshot({ path: `e2e/shots/${name}-dreams.png`, fullPage: true })

  // Module 1 via the Home "continue" link (regression: id 01 must stay a string)
  await page.goto(base + '#/')
  await page.getByRole('link', { name: 'Deschide modulul' }).click()
  await page.waitForURL(/#\/module\/01$/)
  await page.getByRole('heading', { name: 'Visează din nou' }).waitFor()
  const firstVariant = await page.locator('.card h3').first().textContent()
  check(firstVariant === 'Pereche de egali', `${name}: pair variant shown first (got "${firstVariant}")`)
  await page.getByLabel('Dacă (situația)').fill('e duminică seara')
  await page.getByLabel('atunci (ce fac)').fill('scriu trei visuri în caiet')
  await page.getByRole('button', { name: 'Salvează' }).click()
  check(await visible(page.getByText('Plan salvat')), `${name}: if-then plan saved`)
  await page.getByRole('button', { name: 'Am terminat modulul' }).click()
  await page.goto(base + '#/')
  check(await visible(page.getByText('scriu trei visuri în caiet')), `${name}: plan listed on home`)

  // Module 2: My dream worksheet saves and prints (FR-20)
  await page.goto(base + '#/module/02')
  check(await visible(page.getByRole('heading', { name: 'Clarifică un vis' })), `${name}: module 2 opens`)
  await page.getByRole('link', { name: /Visul meu/ }).click()
  await page.waitForURL(/#\/dream$/)
  check(await visible(page.getByText('Să învăț să navighez')), `${name}: chosen dream shown on My dream`)
  await page.getByLabel(/^Claritate/).fill('zece zile pe jos prin Apuseni, cu sora mea')
  await page.getByLabel('Drumul 1').fill('vara viitoare, dintr-o bucată')
  await page.getByLabel('Drumul 1').blur()
  await page.waitForTimeout(300)
  await page.reload()
  check(await visible(page.getByText('1 din 5 întrebări cu răspuns')), `${name}: clarification answer persisted`)
  check((await page.getByLabel('Drumul 1').inputValue()) === 'vara viitoare, dintr-o bucată', `${name}: route persisted`)
  await page.goto(base + '#/book/print/clarify'); await page.waitForSelector('.sheet')
  check(await visible(page.getByText('zece zile pe jos prin Apuseni')), `${name}: clarification sheet prints the answer`)

  // Module 3: matrix and WOOP (FR-13, FR-21)
  await page.goto(base + '#/module/03')
  check(await visible(page.getByRole('heading', { name: 'Fă loc, apoi obstacolul' })), `${name}: module 3 opens`)
  await page.getByRole('link', { name: /Săptămâna mea/ }).click()
  await page.waitForURL(/#\/week$/)
  const wk = page.getByLabel('Un lucru pe care îl fac')
  for (const x of ['ședința de luni', 'am derulat pe telefon o oră']) { await wk.fill(x); await wk.press('Enter') }
  await page.getByText('ședința de luni').click()
  await page.getByRole('button', { name: 'Fă acum' }).click()
  await page.getByText('am derulat pe telefon o oră').click()
  await page.getByRole('button', { name: 'Pun în calendar săptămâna aceasta' }).click()
  await page.waitForTimeout(300)
  check(await visible(page.locator('.cell.plan').getByText('am derulat pe telefon o oră')), `${name}: task moved to Plan quadrant`)
  await page.goto(base + '#/dream')
  await page.getByLabel(/^Obstacolul/).fill('seara deschid telefonul')
  await page.getByLabel(/^Obstacolul/).blur(); await page.waitForTimeout(300)
  await page.reload()
  check(await visible(page.getByText('1 din 4 rânduri scrise')), `${name}: WOOP line persisted`)
  await page.goto(base + '#/book/print/woop'); await page.waitForSelector('.sheet')
  check(await visible(page.getByText('seara deschid telefonul')), `${name}: WOOP sheet prints the answer`)

  // Friend section visible for role "both", gated for "dreamer"
  await page.goto(base + '#/friend')
  check(await visible(page.getByText('Planul întâlnirii')), `${name}: friend section visible for role Both`)
  check(await visible(page.getByText('Pereche de egali (90 de minute)')), `${name}: friend plan content loaded`)
  await page.goto(base + '#/settings')
  await page.getByRole('button', { name: /Schimbă rolul/ }).click()
  await page.getByRole('button', { name: 'Visător', exact: true }).click()
  await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click()
  await page.getByRole('button', { name: 'Salvează alegerea' }).click()
  await page.goto(base + '#/friend')
  check(await visible(page.getByText('Această pagină apare')), `${name}: friend section hidden for Dreamer`)

  // English interface toggle, Romanian content (acceptance 5)
  await page.goto(base + '#/settings')
  await page.getByRole('button', { name: 'English' }).click()
  check(await visible(page.getByRole('heading', { name: 'Settings' })), `${name}: interface switched to English`)
  await page.goto(base + '#/module/01')
  check(await visible(page.getByText('The course text is only in Romanian')), `${name}: content fallback notice shown`)
  check(await visible(page.getByRole('heading', { name: 'Visează din nou' })), `${name}: content stays Romanian`)
  await page.goto(base + '#/settings')
  await page.getByRole('button', { name: 'Română' }).click()

  // Export produces a file
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Salvează o copie' }).click()])
  check(/cartea-visurilor-.*\.json/.test(dl.suggestedFilename()), `${name}: export downloads JSON`)

  // Print sheets render (acceptance 2, in part)
  await page.goto(base + '#/book/print/all')
  await page.waitForSelector('.sheet')
  const sheets = await page.locator('.sheet').count()
  check(sheets === 7, `${name}: seven printable sheets (cover, dreams x2, rating, clarify, week, woop), got ${sheets}`)
  check(await visible(page.getByText('Să învăț să navighez')), `${name}: dreams prefilled on the printed list`)
  await page.emulateMedia({ media: 'print' })
  await page.screenshot({ path: `e2e/shots/${name}-print.png`, fullPage: true })
  await page.emulateMedia({ media: 'screen' })

  check(errors.length === 0, `${name}: no console/page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await ctx.close()
}
await browser.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed')
process.exit(failures ? 1 : 0)
