// Every browser check against a fresh build: builds, serves dist/ with `vite preview`, runs
// each script below against it one after the other, then stops the server.
// Usage: npm run test:e2e   (exit code 1 when any script fails)
import { spawn } from 'node:child_process'
import { build, preview } from 'vite'

const PORT = 4173
const SCRIPTS = ['smoke', 'adversarial', 'import-poison', 'flows', 'races', 'share']

// Always a fresh build: a server left on the port would otherwise test stale code.
await build({ logLevel: 'warn' })
const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'warn' })
const base = `http://localhost:${PORT}/`

const run = (name) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [`e2e/${name}.mjs`, base], { stdio: 'inherit' })
    child.on('exit', (code) => resolve(code ?? 1))
  })

const failed = []
try {
  for (const name of SCRIPTS) {
    console.log(`\n=== ${name}`)
    if ((await run(name)) !== 0) failed.push(name)
  }
} finally {
  await server.close()
}
console.log(failed.length ? `\nfailed: ${failed.join(', ')}` : '\nall browser checks passed')
process.exit(failed.length ? 1 : 0)
