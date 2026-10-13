import Dexie, { type DBCore, type Middleware } from 'dexie'
import { db as defaultDb, type DreamDB } from './db'

/**
 * Events that change the whole database under every open tab. A wipe or an import replaces
 * the data: a tab must not write what it still holds (a box being typed in, a save waiting on
 * its timer), because that text belongs to data that no longer exists, so it stops writing and
 * reloads. A newer version upgrading the schema keeps the data: a tab first stores what it
 * holds, then closes so the upgrade can go ahead, and reloads into the new version.
 */
let frozen = false
let channel: BroadcastChannel | null | undefined
const REPLACED = 'replaced'
/** Opened on first use, and only where it exists (not in unit tests, where an open channel keeps the process alive). */
const getChannel = () =>
  (channel ??=
    typeof BroadcastChannel === 'function' && typeof window !== 'undefined'
      ? new BroadcastChannel('dream-course')
      : null)

/** True once this tab has stopped writing; a component can skip work that would be thrown away. */
export const writesFrozen = () => frozen

function freezeAndReload() {
  frozen = true
  location.reload()
}

/** Work to finish before this tab closes the database for an upgrade (the text boxes register their pending saves). */
const beforeUpgrade = new Set<() => Promise<void>>()
export function onBeforeUpgrade(finish: () => Promise<void>) {
  beforeUpgrade.add(finish)
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
  constructor(cause: unknown) {
    super('a newer version of the app stored this data', { cause })
    this.name = 'OutdatedAppError'
  }
}

/**
 * Opens the database, or explains why it cannot. Needed because a live query never reports a
 * failed open (it waits for ever), which would leave the page blank.
 */
export async function openStorage(d: DreamDB = defaultDb): Promise<void> {
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
  // Subscribers run newest first; returning false keeps Dexie from closing the database at once.
  d.on('versionchange', (ev: IDBVersionChangeEvent) => {
    if (!ev.newVersion) {
      freezeAndReload() // another tab deletes the database (wipe)
      return
    }
    // a newer version opens: store what this tab holds, then let the upgrade go ahead (at most 2 s)
    const finish = Promise.all([...beforeUpgrade].map((f) => f()))
    const timeout = new Promise((r) => setTimeout(r, 2000))
    void Promise.race([finish, timeout]).finally(() => {
      frozen = true
      d.close()
      location.reload()
    })
    return false
  })
  getChannel()?.addEventListener('message', (e) => {
    if (e.data === REPLACED) freezeAndReload()
  })
}

/**
 * Replaces the data on this device (an import): the other tabs are told first and given a
 * moment to stop writing, so a save waiting on a timer there cannot land in the new data;
 * they are told again afterwards, for a tab opened meanwhile.
 */
export async function replaceData(apply: () => Promise<void>) {
  getChannel()?.postMessage(REPLACED)
  await new Promise((r) => setTimeout(r, 300))
  try {
    await apply()
  } finally {
    getChannel()?.postMessage(REPLACED)
  }
}

/**
 * Deletes everything on this device, then reloads. `onBlocked` runs when a tab that does not
 * answer (frozen in the background, or an older version without this module) still holds
 * the database: the delete finishes as soon as that tab closes.
 */
export async function wipeAll(onBlocked: () => void, d: DreamDB = defaultDb) {
  frozen = true
  getChannel()?.postMessage(REPLACED)
  d.on('blocked', onBlocked)
  await d.delete()
  location.reload()
}
