import { useLiveQuery } from 'dexie-react-hooks'
import { db, type DreamDB, type Settings } from './db'
import { settingsFrom } from './schema'

/** The settings table (one row per key): reads always go through the schema, writes stay small. */

/** The stored settings, read through the schema: undefined while loading. */
export const useStoredSettings = () => useLiveQuery(async () => settingsFrom(await db.settings.toArray()), [])

export async function readSettings(d: DreamDB = db): Promise<Settings> {
  return settingsFrom(await d.settings.toArray())
}

export async function writeSettings(patch: Partial<Settings>, d: DreamDB = db) {
  await d.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}

/** Read-modify-write of settings inside one transaction, so two quick taps never overwrite each other. */
export async function mutateSettings(fn: (cur: Settings) => Partial<Settings>, d: DreamDB = db) {
  await d.transaction('rw', d.settings, async () => {
    const cur = await readSettings(d)
    await writeSettings(fn(cur), d)
  })
}
