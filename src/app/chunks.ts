/**
 * A page's code is loaded on first visit. After a new version is published, a tab opened
 * before it asks for files that no longer exist; one reload fetches the new version. The
 * reload happens once per minute at most, and never offline (it would only show the
 * browser's own error page).
 */
const KEY = 'dream-course:chunk-reload'

export function isChunkLoadError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e)
  return /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Failed to fetch/i.test(
    msg,
  )
}

/** Reloads the page to pick up a new version, unless that was just tried. True when a reload started. */
export function reloadForNewVersion(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0)
  } catch {
    return false
  }
  if (Date.now() - last < 60_000) return false
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  location.reload()
  return true
}

/** Wraps a lazy import: a missing file after a new version reloads once instead of failing. */
export function retryImport<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((e) => {
      if (isChunkLoadError(e) && reloadForNewVersion()) return new Promise<T>(() => {})
      throw e
    })
}
