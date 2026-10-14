// Share sheet: the "Send" buttons, with a fake navigator.share that behaves like Chrome on
// Android (it refuses .json and .md, takes plain text). Headless browsers have no share sheet.
// Usage: node e2e/share.mjs http://localhost:5173/
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:4173/'
const browser = await chromium.launch()
let failures = 0
const visible = (loc) =>
  loc.waitFor({ state: 'visible', timeout: 5000 }).then(
    () => true,
    () => false,
  )
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`)
  if (!ok) failures++
}

async function run(mode) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'ro-RO' })
  await ctx.addInitScript((mode) => {
    window.__shared = []
    navigator.canShare = (data) => (data.files ?? []).every((f) => f.type === 'text/plain' && f.name.endsWith('.txt'))
    navigator.share = async (data) => {
      if (mode === 'cancel') throw new DOMException('cancelled', 'AbortError')
      for (const f of data.files ?? []) window.__shared.push({ name: f.name, type: f.type, text: await f.text() })
    }
  }, mode)
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(String(e)))
  await page.goto(base)
  await page.waitForURL(/#\/start/)
  await page.getByRole('button', { name: 'Visător', exact: true }).click()
  await page.getByRole('button', { name: /Un Visător și Prietenul lui/ }).click()
  await page.getByRole('button', { name: 'Începe' }).click()
  await page.waitForURL(/#\/$/)
  await page.goto(base + '#/dreams')
  await page.getByLabel('Un vis nou').fill('Să văd aurora boreală')
  await page.getByLabel('Un vis nou').press('Enter')
  await page.goto(base + '#/settings')

  check(await visible(page.getByRole('button', { name: 'Trimite copia…' })), `${mode}: backup send button shown`)
  check(await visible(page.getByRole('button', { name: 'Trimite cartea…' })), `${mode}: book send button shown`)

  let downloaded = false
  page.on('download', () => (downloaded = true))
  await page.getByRole('button', { name: 'Trimite copia…' }).click()
  await page.getByRole('button', { name: 'Trimite cartea…' }).click()
  await page.waitForTimeout(500)
  const shared = await page.evaluate(() => window.__shared)
  if (mode === 'share') {
    check(shared.length === 2, `share: both files reach the share sheet (${shared.length})`)
    const backup = shared.find((f) => f.name.includes('cartea-visurilor'))
    const book = shared.find((f) => f.name.includes('cartea-mea'))
    check(
      (backup?.name ?? '').endsWith('.json.txt') && backup?.type === 'text/plain',
      `share: backup offered as .json.txt (${backup?.name})`,
    )
    check(JSON.parse(backup?.text ?? '{}').app === 'dream-course', 'share: shared backup is the real backup')
    check(
      (book?.name ?? '').endsWith('.md.txt') && book?.text.includes('aurora boreală'),
      `share: book offered as .md.txt with the dreams (${book?.name})`,
    )
    check(!downloaded, 'share: nothing downloaded when sharing works')

    // the shared .txt backup imports back
    await page.locator('input[type=file]').setInputFiles({
      name: backup.name,
      mimeType: 'text/plain',
      buffer: Buffer.from(backup.text),
    })
    page.once('dialog', (d) => d.accept())
    await page.waitForTimeout(800)
    check(await page.getByText(/Copia a fost încărcată/).isVisible(), 'share: a shared .txt backup imports back')
  } else {
    check(shared.length === 0 && !downloaded, 'cancel: closing the share sheet does nothing, no error, no download')
  }
  check(errors.length === 0, `${mode}: no page errors${errors.length ? ': ' + errors.join(' | ') : ''}`)
  await ctx.close()
}

await run('share')
await run('cancel')
await browser.close()
console.log(failures ? `${failures} check(s) failed` : 'all share checks passed')
process.exit(failures ? 1 : 0)
