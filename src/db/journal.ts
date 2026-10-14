/**
 * Text typed but not stored yet, kept in localStorage while its save is pending. A page that
 * goes away (a reload, a closed tab, a phone that kills the tab, a new version) can lose a
 * database write that had not finished — Chromium drops IndexedDB writes made while a page
 * unloads, and a slow device may not even have started one — but never a localStorage write,
 * which is synchronous. At the next start each entry is replayed into the database (see
 * fields.ts), unless the stored value changed since the edit began (by something other than
 * this box's own save): then the newer text wins.
 */
const KEY = 'dream-course:unsaved'
let closed = false

export interface UnsavedText {
  /** what the box shows */
  text: string
  /** the stored value when the edit began (moved forward each time a save of this box lands) */
  base: string
  /** the text last sent to the database, while that save is not confirmed yet */
  sent?: string
}

const isEntry = (e: unknown): e is UnsavedText => {
  const x = e as Partial<UnsavedText> | null
  return (
    !!x &&
    typeof x.text === 'string' &&
    typeof x.base === 'string' &&
    (x.sent === undefined || typeof x.sent === 'string')
  )
}

/** Entries in storage, each with the tab that wrote it. Malformed entries are left out (and so removed on the next write). */
type Stored = UnsavedText & { tab?: string }
function load(): Record<string, Stored> {
  try {
    const all = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    if (!all || typeof all !== 'object' || Array.isArray(all)) return {}
    return Object.fromEntries(Object.entries(all).filter(([, e]) => isEntry(e))) as Record<string, Stored>
  } catch {
    return {}
  }
}

/** True when written; false when storage is blocked or full (the save itself is still under way). */
function store(all: Record<string, Stored>): boolean {
  try {
    if (Object.keys(all).length) localStorage.setItem(KEY, JSON.stringify(all))
    else localStorage.removeItem(KEY)
    return true
  } catch {
    return false
  }
}

/**
 * This tab, as named in the entries it writes. While the tab lives it holds a lock of that name
 * (claimTab), so a tab that starts meanwhile replays only the entries of tabs that are gone and
 * never writes over the text another open tab is still typing.
 */
const TAB = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, '0')).join('')
const LOCK_PREFIX = 'dream-course:tab:'

/** Holds this tab's lock until the tab goes away (where the browser has Web Locks). */
export function claimTab() {
  void navigator.locks?.request(LOCK_PREFIX + TAB, () => new Promise<never>(() => {})).catch(() => {})
}

/** The tabs still open, as far as the browser can tell (none where Web Locks are missing). */
export async function liveTabs(): Promise<Set<string>> {
  try {
    const held = (await navigator.locks?.query())?.held ?? []
    return new Set(
      held
        .map((l) => l.name ?? '')
        .filter((n) => n.startsWith(LOCK_PREFIX))
        .map((n) => n.slice(LOCK_PREFIX.length)),
    )
  } catch {
    return new Set()
  }
}

/** Remembers the text of one field until its save lands. */
export function keepUnsaved(field: string, entry: UnsavedText) {
  if (closed) return
  const all = load()
  all[field] = entry.sent === undefined ? { text: entry.text, base: entry.base, tab: TAB } : { ...entry, tab: TAB }
  if (store(all)) return
  // storage full: an older entry of this field must not outlive the newer text it no longer matches
  delete all[field]
  store(all)
}

/** Forgets one field's text once it is stored (only if no newer text was typed meanwhile). */
export function dropUnsaved(field: string, text?: string) {
  const all = load()
  if (!(field in all) || (text !== undefined && all[field].text !== text)) return
  delete all[field]
  store(all)
}

/** Forgets everything: the data it belonged to was replaced or deleted (an import, a wipe). */
export function clearUnsaved() {
  store({})
}

/** Forgets everything and keeps nothing more: this tab is about to reload onto replaced data. */
export function closeJournal() {
  closed = true
  store({})
}

/**
 * Calls `replay` each time another tab that kept unsaved text goes away (its lock comes free),
 * so text it had not stored yet is written while this tab stays open, not only at the next
 * start. Tabs that start keeping text later are noticed through the storage event.
 */
export function replayWhenTabsClose(replay: () => unknown) {
  if (!navigator.locks) return
  const watched = new Set<string>()
  const watch = () => {
    for (const { tab } of Object.values(load())) {
      if (!tab || tab === TAB || watched.has(tab)) continue
      watched.add(tab)
      // granted once that tab is gone (at once if it already is); released at once, then the text is written
      navigator.locks
        .request(LOCK_PREFIX + tab, () => {})
        .then(
          () => {
            watched.delete(tab)
            void replay()
          },
          () => watched.delete(tab),
        )
    }
  }
  watch()
  globalThis.addEventListener?.('storage', (e) => {
    if (e.key === KEY) watch()
  })
}

/** The entries left by tabs that are gone (a tab still open keeps saving its own). */
export async function orphanedEntries(): Promise<[string, UnsavedText & { tab?: string }][]> {
  const live = await liveTabs()
  return Object.entries(load()).filter(([, e]) => !e.tab || !live.has(e.tab))
}
