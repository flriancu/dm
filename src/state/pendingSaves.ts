import { onBeforeUpgrade, writesFrozen } from '../db/lifecycle'

/**
 * Text boxes whose last text is not stored yet (typed, or a save on its way). Chromium drops
 * a database write that starts while the page unloads, so a reload, a closed tab or a link
 * to another site within a moment of typing would lose it. Leaving the page with a save
 * pending starts it at once and asks the browser to wait (its own "leave the page?"
 * question); by the time the question is answered the save has landed. A newer version
 * upgrading the database also waits for these saves before this tab lets go of it.
 */
const pending = new Map<symbol, () => void>()
let installed = false

function onBeforeUnload(e: BeforeUnloadEvent) {
  // a wipe or import in another tab reloads this one on purpose: its unsaved text belongs to data that is gone
  if (pending.size === 0 || writesFrozen()) return
  pending.forEach((flush) => flush())
  e.preventDefault()
  e.returnValue = '' // older browsers ask only when this is set
}

/** Starts every pending save and resolves once all are stored (the boxes unregister themselves then). */
async function storeAll() {
  pending.forEach((flush) => flush())
  while (pending.size > 0) await new Promise((r) => setTimeout(r, 25))
}

/** Registers a box's flush while it has text not yet stored; `null` once it is stored. */
export function setPending(box: symbol, flush: (() => void) | null) {
  if (!installed) {
    window.addEventListener('beforeunload', onBeforeUnload)
    onBeforeUpgrade(storeAll)
    installed = true
  }
  if (flush) pending.set(box, flush)
  else pending.delete(box)
}
