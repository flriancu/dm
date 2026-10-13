// Screenshot sweep of every screen, for layout review. Usage: node e2e/sweep.mjs http://localhost:5173/ [width]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
const base = process.argv[2] ?? 'http://localhost:5173/'
const width = Number(process.argv[3] ?? 390)
mkdirSync('e2e/shots/sweep', { recursive: true })
const b = await chromium.launch()
const p = await b.newPage({ viewport: { width, height: 800 } })
const shot = (name) => p.screenshot({ path: `e2e/shots/sweep/${width}-${name}.png`, fullPage: true })

await p.goto(base); await p.waitForURL(/start/)
await p.getByRole('button', { name: 'Ambele' }).click(); await p.getByRole('button', { name: 'Pereche de egali' }).click()
await shot('01-onboarding')
await p.getByRole('button', { name: 'Începe' }).click(); await p.waitForURL(/#\/$/)
// seed data
await p.goto(base + '#/dreams')
const input = p.getByLabel('Un vis nou')
for (const d of ['Să văd aurora boreală', 'Să gătesc o ciorbă ca a bunicii', 'O seară pe săptămână doar pentru mine']) { await input.fill(d); await input.press('Enter') }
await p.getByText('Să văd aurora boreală').click()
await p.getByLabel(/^Importanță/).fill('9'); await p.getByRole('button', { name: 'din interior' }).click()
await p.getByRole('button', { name: /Aleg acest vis/ }).click()
await p.getByText('Criteriile mele').click()
await p.getByPlaceholder('de exemplu: mă apropie').fill('mă apropie de familie'); await p.getByRole('button', { name: 'Adaugă criteriul' }).click()
await p.waitForTimeout(300); await shot('05-dreams')
await p.goto(base + '#/module/01'); await p.getByRole('heading', { name: 'Visează din nou' }).waitFor()
await p.getByLabel('Dacă (situația)').fill('e duminică seara'); await p.getByLabel('atunci (ce fac)').fill('scriu trei visuri'); await p.getByRole('button', { name: 'Salvează' }).click()
await p.waitForTimeout(300); await shot('04-module')
await p.goto(base + '#/'); await p.waitForTimeout(300); await shot('02-home')
await p.goto(base + '#/modules'); await p.waitForTimeout(300); await shot('03-modules')
await p.goto(base + '#/book'); await p.waitForTimeout(300); await shot('06-book')
await p.goto(base + '#/book/print/cover'); await p.waitForSelector('.sheet'); await shot('07-book-print')
await p.goto(base + '#/friend'); await p.waitForTimeout(400); await shot('08-friend')
await p.goto(base + '#/settings'); await p.waitForTimeout(300); await shot('09-settings')
await p.getByRole('button', { name: /Schimbă rolul/ }).click(); await p.getByRole('button', { name: 'Visător' , exact: true }).click(); await shot('09b-settings-picker')
await p.goto(base + '#/sources'); await p.waitForTimeout(400); await shot('10-sources')
await b.close()
console.log('done')
