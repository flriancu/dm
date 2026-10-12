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
  await page.getByRole('button', { name: 'Ambele' }).click()
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
  const input = page.getByPlaceholder('Un vis')
  for (const d of ['Să învăț să navighez', 'Un ceas scump', 'O casă la munte']) { await input.fill(d); await input.press('Enter') }
  check(await visible(page.getByText('3 din 100')), `${name}: three dreams counted`)
  await page.getByText('Să învăț să navighez').click()
  await page.getByLabel('Importanță 1–10').fill('9')
  await page.getByRole('button', { name: 'din interior' }).click()
  await page.getByRole('button', { name: 'Lucrez la acest vis' }).click()
  check(await visible(page.getByText('Visul ales')), `${name}: a dream can be chosen`)
  await page.screenshot({ path: `e2e/shots/${name}-dreams.png`, fullPage: true })

  // Module 1: friend variant order (pair first) and if-then plan
  await page.goto(base + '#/module/01')
  await page.getByRole('heading', { name: 'Visează din nou' }).waitFor()
  const firstVariant = await page.locator('.card h3').first().textContent()
  check(firstVariant === 'Pereche', `${name}: pair variant shown first (got "${firstVariant}")`)
  await page.getByLabel('Dacă…').fill('e duminică seara')
  await page.getByLabel('…atunci voi…').fill('scriu trei visuri în caiet')
  await page.getByRole('button', { name: 'Salvează' }).click()
  check(await visible(page.getByText('Plan salvat')), `${name}: if-then plan saved`)
  await page.getByRole('button', { name: 'Gata' }).click()
  await page.goto(base + '#/')
  check(await visible(page.getByText('scriu trei visuri în caiet')), `${name}: plan listed on home`)

  // Friend section visible for role "both", gated for "dreamer"
  await page.goto(base + '#/friend')
  check(await visible(page.getByText('Planul întâlnirii')), `${name}: friend section visible for role Both`)
  check(await visible(page.getByText('Pereche (90 de minute)')), `${name}: friend plan content loaded`)
  await page.goto(base + '#/settings')
  await page.getByRole('button', { name: 'Visător', exact: true }).click()
  await page.goto(base + '#/friend')
  check(await visible(page.getByText('Această secțiune apare')), `${name}: friend section hidden for Dreamer`)

  // English interface toggle, Romanian content (acceptance 5)
  await page.goto(base + '#/settings')
  await page.getByRole('button', { name: 'English' }).click()
  check(await visible(page.getByRole('heading', { name: 'Settings' })), `${name}: interface switched to English`)
  await page.goto(base + '#/module/01')
  check(await visible(page.getByText('Course content is in Romanian')), `${name}: content fallback notice shown`)
  check(await visible(page.getByRole('heading', { name: 'Visează din nou' })), `${name}: content stays Romanian`)
  await page.goto(base + '#/settings')
  await page.getByRole('button', { name: 'Română' }).click()

  // Export produces a file
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Exportă/ }).click()])
  check(/cartea-visurilor-.*\.json/.test(dl.suggestedFilename()), `${name}: export downloads JSON`)

  // Print sheets render (acceptance 2, in part)
  await page.goto(base + '#/book/print/all')
  await page.waitForSelector('.sheet')
  const sheets = await page.locator('.sheet').count()
  check(sheets === 4, `${name}: four printable sheets (cover, dreams x2, rating), got ${sheets}`)
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
