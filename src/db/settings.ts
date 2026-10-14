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

/** 24 hex digits. crypto.getRandomValues, not randomUUID: the intranet site is plain http, where randomUUID does not exist. */
const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('')

/**
 * The id of a calendar event for `purpose` ("meeting-03", "letter", "checkin"): the same on
 * every export from this person (re-importing moves the event instead of doubling it), and
 * different from everyone else's (a shared calendar never mixes two people's meetings). The
 * device part is made once and travels with the backup.
 */
export async function calendarUid(purpose: string, d: DreamDB = db): Promise<string> {
  let id = ''
  await mutateSettings((s) => {
    id = s.calendarId ?? randomId()
    return s.calendarId ? {} : { calendarId: id }
  }, d)
  return `${purpose}-${id}`
}

/** Read-modify-write of settings inside one transaction, so two quick taps never overwrite each other. */
export async function mutateSettings(fn: (cur: Settings) => Partial<Settings>, d: DreamDB = db) {
  await d.transaction('rw', d.settings, async () => {
    const cur = await readSettings(d)
    await writeSettings(fn(cur), d)
  })
}
