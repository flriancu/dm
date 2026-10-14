import { describe, it, expect, afterEach } from 'vitest'
import { DreamDB } from './db'
import { openStorage, OutdatedAppError } from './lifecycle'

const listing = indexedDB.databases
const names = async () => (await listing.call(indexedDB)).map((x) => x.name)

/** Leaves a database on disk at the given IndexedDB version, as a newer app would. */
const writtenBy = (name: string, version: number) =>
  new Promise<void>((resolve, reject) => {
    const req = indexedDB.open(name, version)
    req.onsuccess = () => (req.result.close(), resolve())
    req.onerror = () => reject(req.error)
  })

afterEach(() => {
  indexedDB.databases = listing
})

describe.each([
  ['where the browser lists its databases', () => {}],
  ['where it cannot (no indexedDB.databases)', () => void (indexedDB.databases = undefined as never)],
])('opening storage, %s', (_, setup) => {
  it('refuses data written by a newer version, without touching it', async () => {
    const d = new DreamDB(`newer-${Math.random()}`)
    await writtenBy(d.name, (d.verno + 1) * 10)
    setup()
    await expect(openStorage(d)).rejects.toBeInstanceOf(OutdatedAppError)
    expect(d.isOpen()).toBe(false)
  })

  it('creates the database on first use, with every table', async () => {
    const d = new DreamDB(`fresh-${Math.random()}`)
    setup()
    await openStorage(d)
    expect(d.tables.map((t) => t.name)).toContain('dreams')
    await d.dreams.add({ text: 'x', dateAdded: '2026-01-01', chosen: 0 })
    d.close()
    expect(await names()).toContain(d.name)
  })

  it('opens data of the same version', async () => {
    const d = new DreamDB(`same-${Math.random()}`)
    await d.open()
    d.close()
    setup()
    await openStorage(d)
    expect(d.isOpen()).toBe(true)
    d.close()
  })
})
