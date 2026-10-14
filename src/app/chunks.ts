import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * A page's code is loaded on first visit. After a new version is published, a tab opened
 * before it asks for files that no longer exist; one reload fetches the new version. The
 * reload happens once per minute at most (a file missing for good must not reload the page
 * in a loop), and never offline (it would only show the browser's own error page).
 */
const KEY = 'dream-course:chunk-reload'

export function isChunkLoadError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e)
  return /dynamically imported module|Importing a module script failed|error loading dynamically|ChunkLoadError|Failed to fetch/i.test(
    msg,
  )
}

/**
 * Reloads the page to pick up a new version, unless that was tried less than `gap` ms ago.
 * True when a reload started. The connection coming back is reason enough for a shorter gap.
 */
export function reloadForNewVersion(gap = 60_000): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return false
  let last = 0
  try {
    last = Number(sessionStorage.getItem(KEY) ?? 0)
  } catch {
    return false
  }
  if (Date.now() - last < gap) return false
  try {
    sessionStorage.setItem(KEY, String(Date.now()))
  } catch {
    return false
  }
  location.reload()
  return true
}

/** Wraps a lazy import: a missing file after a new version reloads once instead of failing. */
function retryImport<T>(load: () => Promise<T>): () => Promise<T> {
  return () =>
    load().catch((e) => {
      if (isChunkLoadError(e) && reloadForNewVersion()) return new Promise<T>(() => {})
      throw e
    })
}

/** Pages whose code failed to load: forgotten when the connection comes back (one listener for all). */
const retryOnline = new Set<() => void>()
if (typeof window !== 'undefined')
  window.addEventListener('online', () => {
    for (const forget of retryOnline) forget()
    retryOnline.clear()
  })

/**
 * A page whose code is loaded on first visit. React keeps a failed load for good, so a page
 * first opened offline would fail on every later visit, online too; here a failed load is
 * forgotten once the connection is back, and the next visit loads it again.
 */
export function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): ComponentType<P> {
  const fresh = (): LazyExoticComponent<ComponentType<P>> =>
    lazy(() =>
      retryImport(load)().catch((e) => {
        retryOnline.add(() => (current = fresh()))
        throw e
      }),
    )
  let current = fresh()
  return (props: P) => createElement(current, props)
}
