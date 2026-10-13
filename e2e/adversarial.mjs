// Adversarial browser test: malformed, oversized, rapid and out-of-range input on every page.
// Usage: node e2e/adversarial.mjs http://localhost:5173/
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173/'
const browser = await chromium.launch()
let failures = 0
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) failures++ }
const visible = async (loc) => loc.first().waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false)
const LONG = 'Ă'.repeat(3000)
const WEIRD = '<b>bold</b> "quotes" \'apos\' & amp; 🚀 שלום مرحبا 𝔘𝔫𝔦 \u0000null'

const ctx = await browser.newContext({ viewport: { width: 360, height: 740 }, locale: 'ro-RO' })
const page = await ctx.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
const noOverflow = async (label) => check(!(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)), `no horizontal overflow: ${label}`)

// ---- onboarding: nothing proceeds until role and config are chosen
await page.goto(base); await page.waitForURL(/#\/start/)
check(!(await page.getByRole('button', { name: 'Începe' }).isVisible()), 'onboarding: Begin hidden before role/config')
await page.getByRole('button', { name: 'Visător', exact: true }).click()
check(!(await page.getByRole('button', { name: 'Începe' }).isVisible()), 'onboarding: Begin hidden before config')
await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click()
// cadence stepper clamps
const cad = page.locator('#cad')
await cad.fill('100'); check((await cad.inputValue()) === '42', 'cadence clamps to 42')
await cad.fill('1'); check((await cad.inputValue()) === '7', 'cadence clamps to 7')
await cad.pressSequentially('abc'); check(/^\d+$/.test(await cad.inputValue()), 'cadence ignores letters')
await page.getByRole('button', { name: 'Începe' }).click(); await page.waitForURL(/#\/$/)

// ---- bad routes
await page.goto(base + '#/module/99'); check(await visible(page.getByText(/Nu există un modul/)), 'unknown module id shows not-found')
await page.goto(base + '#/module/abc'); check(await visible(page.getByText(/Nu există un modul/)), 'garbage module id shows not-found')
await page.goto(base + '#/book/print/xyz'); check(await visible(page.getByRole('link', { name: 'Înapoi' })), 'unknown sheet id shows only the back button')
await page.goto(base + '#/nope'); await page.waitForURL(/#\/$/); check(true, 'unknown route redirects home')
await page.goto(base + '#/friend'); check(await visible(page.getByText(/Această pagină apare doar/)), 'friend page gated for a Dreamer')
await page.goto(base + '#/dream'); check(await visible(page.getByText(/Încă nu ai ales un vis/)), 'My dream without a chosen dream explains what to do')

// ---- dreams: whitespace, duplicates by double Enter, long and weird text, XSS as text
await page.goto(base + '#/dreams')
const inp = page.getByLabel('Un vis nou')
await inp.fill('   '); check(await page.getByRole('button', { name: 'Adaugă visul' }).isDisabled(), 'whitespace-only dream cannot be added')
await inp.fill('dublu'); await inp.press('Enter'); await inp.press('Enter'); await page.waitForTimeout(400)
check((await page.getByText('dublu', { exact: true }).count()) === 1, 'double Enter adds one dream, not two')
await inp.fill(LONG); await inp.press('Enter'); await page.waitForTimeout(300)
check(await visible(page.getByText(LONG.slice(0, 50))), 'very long dream text is stored and shown')
await noOverflow('long dream text')
await inp.fill(WEIRD); await inp.press('Enter'); await page.waitForTimeout(300)
check(await visible(page.getByText('<b>bold</b>')), 'html in a dream is shown as text, not rendered')
check((await page.locator('b', { hasText: 'bold' }).count()) === 0, 'no injected element from dream text')
// choose, release, choose another; My dream follows the chosen one
await page.getByText('dublu', { exact: true }).click(); await page.getByRole('button', { name: /Aleg acest vis/ }).click()
await page.goto(base + '#/dream'); check(await visible(page.getByText('dublu')), 'My dream shows the chosen dream')
await page.getByRole('button', { name: 'Las visul' }).click(); check(await visible(page.getByText(/Visul a fost lăsat/)), 'release from My dream')
await page.goto(base + '#/dreams'); await page.getByText('<b>bold</b>').click(); await page.getByRole('button', { name: /Aleg acest vis/ }).click()
await page.goto(base + '#/dream'); check(await visible(page.getByText('<b>bold</b>')), 'My dream switches to the newly chosen dream after a release')
// score chips: only one active
await page.goto(base + '#/dreams'); await page.getByText('<b>bold</b>').click()
await page.getByRole('button', { name: '3', exact: true }).first().click(); await page.getByRole('button', { name: '7', exact: true }).first().click(); await page.waitForTimeout(200)
check((await page.locator('.chip.on', { hasText: /^7$/ }).count()) === 1 && (await page.locator('.chip.on', { hasText: /^3$/ }).count()) === 0, 'score keeps only the last chip')

// ---- values: max five stars; non-negotiable only among chosen
await page.goto(base + '#/vision')
for (let i = 1; i <= 7; i++) { await page.getByLabel(`Valoarea ${i}`, { exact: true }).fill(`v${i}`); await page.getByLabel(`Valoarea ${i}`, { exact: true }).blur() }
await page.waitForTimeout(400)
const stars = page.getByRole('button', { name: 'Una din cele cinci' })
for (let i = 0; i < 5; i++) { await stars.nth(i).click(); await page.waitForTimeout(150) }
check(await stars.nth(5).isDisabled(), 'sixth value cannot be starred')
check((await page.getByRole('button', { name: 'Nu renunț oricât ar costa' }).count()) === 5, 'non-negotiable offered only for the five chosen')

// ---- letter: seal disabled when empty or date out of range; open anyway works
check(await page.getByRole('button', { name: 'Sigilez scrisoarea' }).isDisabled(), 'cannot seal an empty letter')
await page.getByLabel(/^Scrisoarea, de la mine/).fill(WEIRD + LONG); await page.getByLabel(/^Scrisoarea, de la mine/).blur()
await page.locator('#letter-date').fill('2020-01-01')
check(await page.getByRole('button', { name: 'Sigilez scrisoarea' }).isDisabled(), 'cannot seal with a past date')
await page.locator('#letter-date').fill('2099-01-01')
check(await page.getByRole('button', { name: 'Sigilez scrisoarea' }).isDisabled(), 'cannot seal with a date beyond 12 months')
const ok = new Date(); ok.setMonth(ok.getMonth() + 4); await page.locator('#letter-date').fill(ok.toISOString().slice(0, 10))
await page.getByRole('button', { name: 'Sigilez scrisoarea' }).click(); check(await visible(page.getByText(/Sigilată până pe/)), 'seal with a valid date')
await page.getByRole('button', { name: 'O deschid oricum' }).click(); check(await visible(page.getByText(/Acum e deschisă/)), 'open anyway shows the letter again')
await noOverflow('vision page with long letter')

// ---- week: calendar mark is exclusive; delete works
await page.goto(base + '#/week')
const wk = page.getByLabel('Un lucru pe care îl fac')
for (const x of ['unu', 'doi']) { await wk.fill(x); await wk.press('Enter') }
await page.getByText('unu', { exact: true }).click(); await page.getByRole('button', { name: 'Pun în calendar săptămâna aceasta' }).click(); await page.waitForTimeout(200)
await page.getByText('doi', { exact: true }).click(); await page.getByRole('button', { name: 'Pun în calendar săptămâna aceasta' }).click(); await page.waitForTimeout(300)
check((await page.locator('.chip', { hasText: '★' }).count()) === 1, 'only one item is in the calendar at a time')
await page.getByRole('button', { name: 'Șterge lucrul' }).click(); await page.waitForTimeout(200)
check((await page.getByText('doi', { exact: true }).count()) === 0, 'delete removes the item')

// ---- calm: three saboteurs max; SWLS save gated
await page.goto(base + '#/calm')
const sabs = ['Vigilentul', 'Performerul', 'Controlorul', 'Perfecționistul']
for (const s of sabs.slice(0, 3)) await page.getByRole('button', { name: new RegExp('^' + s) }).first().click()
check(await page.getByRole('button', { name: /^Perfecționistul/ }).first().isDisabled({ timeout: 3000 }).catch(() => false) || await page.getByRole('button', { name: /^Perfecționistul/ }).first().evaluate((b) => new Promise((r) => { const t = setTimeout(() => r(b.disabled), 1500); const o = new MutationObserver(() => { if (b.disabled) { clearTimeout(t); r(true) } }); o.observe(b, { attributes: true }) })), 'fourth saboteur cannot be chosen')
check(await page.getByRole('button', { name: 'Salvează fotografia de azi' }).isDisabled(), 'wheel snapshot needs all five statements')
await page.getByRole('button', { name: 'Scriu o întâmplare' }).click()
check(await page.getByRole('button', { name: 'Salvează întâmplarea' }).isDisabled(), 'journal needs the first box')
await page.getByLabel('Ce s-a întâmplat').fill('   '); check(await page.getByRole('button', { name: 'Salvează întâmplarea' }).isDisabled(), 'journal rejects whitespace')

// ---- settings: import garbage, wrong schema, round trip; role switch hides dreamer parts
await page.goto(base + '#/settings')
const fileInput = page.locator('input[type=file]')
await fileInput.setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{not json') })
check(await visible(page.getByText(/nu a putut fi citit/)), 'malformed JSON import is refused with a message')
await fileInput.setInputFiles({ name: 'v2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ app: 'dream-course', schema: 2, dreams: [], plans: [], settings: [] })) })
check(await visible(page.getByText(/nu a putut fi citit/)), 'unknown schema import is refused')
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Salvează o copie' }).click()])
const exported = await (await import('node:fs/promises')).readFile(await dl.path(), 'utf8')
const parsed = JSON.parse(exported)
check(parsed.dreams.length === 3 && parsed.vision?.length === 1, `export contains the data (dreams=${parsed.dreams.length}, vision=${parsed.vision?.length})`)
await fileInput.setInputFiles({ name: 'ok.json', mimeType: 'application/json', buffer: Buffer.from(exported) })
check(await visible(page.getByText(/Copia a fost încărcată: 3 visuri/)), 'round-trip import restores the data')
// role → Prietenul Visului: learner pages hidden
await page.getByRole('button', { name: /Schimbă rolul/ }).click(); await page.getByRole('button', { name: 'Prietenul Visului', exact: true }).click()
await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click(); await page.getByRole('button', { name: 'Salvează alegerea' }).click(); await page.waitForTimeout(300)
check(!(await page.getByRole('link', { name: 'Visuri' }).isVisible()), 'Friend role: Visuri hidden from the bar')
await page.goto(base + '#/dreams'); check(await visible(page.getByText(/Această pagină este pentru Visător/)), 'Friend role: dreams page explains it is not for them')
await page.goto(base + '#/module/01'); check(!(await page.getByLabel(/^Notițele mele despre acest modul/).isVisible()), 'Friend role: module page hides the Dreamer boxes')
check(await visible(page.getByText(/Planul acestei întâlniri/)), 'Friend role: module page points to the meeting plan')
await page.goto(base + '#/'); check(!(await page.getByText('Visul la care lucrez').isVisible()), 'Friend role: Home hides the dream card')
check(!(await page.getByText('Paginile mele de lucru').isVisible()), 'Friend role: Home hides the worksheet links')
check(await visible(page.getByText('Modulul 0: Bun venit')), 'Friend role: Home starts with module 0 too')
await page.goto(base + '#/module/00'); await page.getByRole('button', { name: 'Am citit modulul 0' }).click(); await page.waitForTimeout(200)
await page.goto(base + '#/'); check(await visible(page.getByRole('link', { name: 'Deschide planul întâlnirii' })), 'Friend role: Home links to the meeting plan')
// the friend page without an id opens on the next meeting (module 0 is not a meeting)
await page.goto(base + '#/friend'); await page.waitForURL(/#\/friend\/01$/, { timeout: 5000 }).then(() => check(true, 'friend page opens on the next meeting'), () => check(false, 'friend page opens on the next meeting'))
check((await page.locator('.content .card h3').first().textContent())?.startsWith('Un Visător') === true, 'friend page shows the chosen configuration first')
check(await visible(page.getByText(/Nicio notiță la acest modul/)), 'friend notes have an empty state')
await page.goto(base + '#/friend/09'); check(await visible(page.getByText(/Nicio notiță|Modulul 1/)), 'friend page with an unknown id does not crash')
await page.goto(base + '#/module/01'); check(await visible(page.getByRole('button', { name: 'Întâlnirea a avut loc' })), 'Friend role: can mark the meeting as held')
// role → Ambele + grup: the leader chip
await page.goto(base + '#/settings'); await page.getByRole('button', { name: /Schimbă rolul/ }).click(); await page.getByRole('button', { name: 'Ambele' }).click()
await page.getByRole('button', { name: /Prieten al Visului și grup/ }).click(); await page.getByRole('button', { name: 'Salvează alegerea' }).click(); await page.waitForTimeout(300)
await page.goto(base + '#/module/02'); check(await visible(page.getByText('Eu conduc întâlnirea')), 'Both+group: module page shows the leader chip')
await page.goto(base + '#/module/00'); await page.getByRole('button', { name: 'Am citit modulul 0' }).waitFor(); check(!(await page.locator('.chip', { hasText: 'Eu conduc întâlnirea' }).isVisible()), 'module 0 has no leader chip')
check(await visible(page.getByRole('button', { name: 'Am citit modulul 0' })), 'module 0 has its own done button')
check(!(await page.getByLabel(/^Un cuvânt despre cum a fost întâlnirea/).isVisible()), 'module 0 has no one-word box')
// cadence warning under 14 days
await page.goto(base + '#/settings'); await page.locator('#cd').fill('7'); await page.waitForTimeout(200)
check(await visible(page.getByText(/exercițiile de două săptămâni/)), 'cadence under 14 days shows the warning')
await page.locator('#cd').fill('14'); await page.waitForTimeout(200); check(!(await page.getByText(/exercițiile de două săptămâni/).isVisible()), 'warning gone at 14 days')
// paper mode: the chosen dream is typed in one box and reaches Visul meu and Home
await page.getByRole('checkbox', { name: /Țin lista de visuri pe hârtie/ }).check(); await page.waitForTimeout(200)
await page.goto(base + '#/dreams'); await page.getByLabel(/Visul la care lucrez \(copiat din caiet\)/).fill('zece zile pe jos prin Apuseni'); await page.getByLabel(/Visul la care lucrez \(copiat din caiet\)/).blur(); await page.waitForTimeout(400)
await page.goto(base + '#/dream'); check(await visible(page.getByText('zece zile pe jos prin Apuseni')), 'paper mode: the typed dream opens Visul meu')
await page.goto(base + '#/'); check(await visible(page.getByText('zece zile pe jos prin Apuseni')), 'paper mode: Home shows the chosen dream')
await page.goto(base + '#/dreams'); await page.getByLabel(/Visul la care lucrez \(copiat din caiet\)/).fill('zece zile pe jos, cu sora mea'); await page.getByLabel(/Visul la care lucrez \(copiat din caiet\)/).blur(); await page.waitForTimeout(400)
await page.goto(base + '#/'); check(await visible(page.getByText('zece zile pe jos, cu sora mea')) && !(await page.getByText('zece zile pe jos prin Apuseni').isVisible()), 'paper mode: retyping replaces, never duplicates')
await page.goto(base + '#/settings'); await page.getByRole('checkbox', { name: /Țin lista de visuri pe hârtie/ }).uncheck(); await page.waitForTimeout(200)
// wipe
await page.goto(base + '#/settings'); page.once('dialog', (d) => d.accept()); await page.getByRole('button', { name: /Șterge toate datele/ }).click()
await page.waitForURL(/#\/start/, { timeout: 8000 }).then(() => check(true, 'wipe returns to onboarding'), () => check(false, 'wipe returns to onboarding'))

// ---- two tabs write concurrently
const p2 = await ctx.newPage()
await page.goto(base); await page.waitForURL(/#\/start/)
await page.getByRole('button', { name: 'Visător', exact: true }).click(); await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click(); await page.getByRole('button', { name: 'Începe' }).click(); await page.waitForURL(/#\/$/)
await page.goto(base + '#/dreams'); await p2.goto(base + '#/dreams'); await p2.getByLabel('Un vis nou').waitFor()
await page.getByLabel('Un vis nou').fill('din tab 1'); await page.getByLabel('Un vis nou').press('Enter')
await p2.getByLabel('Un vis nou').fill('din tab 2'); await p2.getByLabel('Un vis nou').press('Enter')
await page.waitForTimeout(600)
check(await visible(page.getByText('din tab 2')) && await visible(p2.getByText('din tab 1')), 'two tabs see each other\'s writes')

check(errors.length === 0, `no console or page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`)
await browser.close()
console.log(failures ? `\n${failures} check(s) failed` : '\nall adversarial checks passed')
process.exit(failures ? 1 : 0)
