import Dexie, { type DBCore, type Middleware } from 'dexie'
import { db as defaultDb, type DreamDB } from './db'
import { clearUnsaved, closeJournal } from './journal'

/**
 * Events that change the whole database under every open tab. A wipe or an import replaces
 * the data: a tab must not write what it still holds (a box being typed in, a save waiting on
 * its timer, its unsaved-text journal), because that text belongs to data that no longer
 * exists, so it stops writing, forgets it and reloads. A newer version upgrading the schema
 * keeps the data: a tab lets go of the database at once and reloads into the new version; the
 * journal carries its unsaved text across the reload.
 */
let frozen = false
let channel: BroadcastChannel | null | undefined
const REPLACED = 'replaced'
const REPLACED_KEY = 'dream-course:replaced' // the same news through the storage event, for browsers without BroadcastChannel
/** Opened on first use, and only where it exists (not in unit tests, where an open channel keeps the process alive). */
const getChannel = () =>
  (channel ??=
    typeof BroadcastChannel === 'function' && typeof window !== 'undefined'
      ? new BroadcastChannel('dream-course')
      : null)

/** True once this tab has stopped writing; a component can skip work that would be thrown away. */
export const writesFrozen = () => frozen

function freezeAndReload() {
  if (frozen) return // told twice (both channels, or both messages of an import): one reload is enough
  frozen = true
  closeJournal()
  location.reload()
}

/**
 * Tells every other tab that the data was replaced, by both channels: BroadcastChannel, and the
 * storage event for browsers without it (and tabs of a version that listened only to that).
 * A tab told twice reloads once.
 */
function announceReplaced() {
  getChannel()?.postMessage(REPLACED)
  try {
    localStorage.setItem(REPLACED_KEY, String(Date.now()))
  } catch {
    // storage blocked: such tabs learn of it when they next reload
  }
}

/** Rejects every write once the tab is frozen, whichever table or module it comes from. */
const freezeMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'freeze-after-replace',
  create: (down) => ({
    ...down,
    table: (name) => {
      const t = down.table(name)
      return {
        ...t,
        mutate: (req) =>
          frozen ? Promise.reject(new Dexie.DatabaseClosedError('data replaced in another tab')) : t.mutate(req),
      }
    },
  }),
}

/** The browser gives the app no storage at all: a private window, blocked site data, no IndexedDB. */
export class StorageUnavailableError extends Error {
  constructor(cause: unknown) {
    super('storage unavailable', { cause })
    this.name = 'StorageUnavailableError'
  }
}
/** The data on this device was written by a newer version of the app than this tab's: a reload fetches it. */
export class OutdatedAppError extends Error {
  constructor(cause?: unknown) {
    super('a newer version of the app stored this data', { cause })
    this.name = 'OutdatedAppError'
  }
}

/** The database's version on disk, without creating or upgrading it; undefined when there is none or it cannot be told. */
async function versionOnDisk(name: string): Promise<number | undefined> {
  try {
    if (indexedDB.databases) return (await indexedDB.databases()).find((x) => x.name === name)?.version
  } catch {
    // listing refused: ask the database itself
  }
  return openedVersion(name)
}

/**
 * Where the browser cannot list its databases: opens this one without a version, which opens it
 * as it is on disk, and never creates it (the creation is aborted, so Dexie still creates it
 * properly afterwards).
 */
function openedVersion(name: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(name)
    } catch {
      return resolve(undefined)
    }
    req.onupgradeneeded = () => req.transaction?.abort() // not there yet
    req.onsuccess = () => {
      const v = req.result.version
      req.result.close()
      resolve(v)
    }
    req.onerror = (e) => {
      e.preventDefault()
      resolve(undefined)
    }
  })
}

/**
 * Opens the database, or explains why it cannot: no storage at all, or data written by a
 * newer version (checked before opening: Dexie would otherwise adapt the newer schema to this
 * older code, and a newer tab open meanwhile would lose its database). Needed at start because
 * a live query never reports a failed open (it waits for ever), which would leave the page blank.
 */
export async function openStorage(d: DreamDB = defaultDb): Promise<void> {
  const onDisk = await versionOnDisk(d.name)
  if (onDisk !== undefined && onDisk >= (d.verno + 1) * 10) throw new OutdatedAppError()
  try {
    await d.open()
  } catch (e) {
    if (frozen) return
    const name = (e as { name?: string })?.name
    const inner = (e as { inner?: { name?: string } })?.inner?.name
    throw name === 'VersionError' || inner === 'VersionError' ? new OutdatedAppError(e) : new StorageUnavailableError(e)
  }
}

/** Called once at start-up, before the first query opens the database. */
export function installLifecycle(d: DreamDB = defaultDb) {
  d.use(freezeMiddleware)
  // Subscribers run newest first; returning false keeps Dexie from closing the database itself.
  d.on('versionchange', (ev: IDBVersionChangeEvent) => {
    if (!ev.newVersion) {
      freezeAndReload() // another tab deletes the database (wipe)
      return
    }
    frozen = true // a newer version opens: let go at once, the journal keeps what is not stored yet
    d.close()
    location.reload()
    return false
  })
  getChannel()?.addEventListener('message', (e) => {
    if (e.data === REPLACED) freezeAndReload()
  })
  window.addEventListener('storage', (e) => {
    if (e.key === REPLACED_KEY && e.newValue) freezeAndReload()
  })
}

/**
 * Replaces the data on this device (an import): the unsaved-text journal is emptied, the other
 * tabs are told first and given a moment to stop writing, so a save waiting on a timer there
 * cannot land in the new data; they are told again afterwards, for a tab opened meanwhile.
 */
export async function replaceData(apply: () => Promise<void>) {
  clearUnsaved()
  announceReplaced()
  await new Promise((r) => setTimeout(r, 300))
  try {
    await apply()
  } finally {
    announceReplaced()
  }
}

/**
 * Deletes everything on this device, then reloads. `onBlocked` runs when a tab that does not
 * answer (frozen in the background, or an older version without this module) still holds
 * the database: the delete finishes as soon as that tab closes.
 */
export async function wipeAll(onBlocked: () => void, d: DreamDB = defaultDb) {
  frozen = true
  closeJournal()
  announceReplaced()
  d.on('blocked', onBlocked)
  await d.delete()
  location.reload()
}
