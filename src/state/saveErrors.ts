import { useSyncExternalStore } from 'react'
import Dexie from 'dexie'
import { writesFrozen } from '../db/lifecycle'

/**
 * The last write the browser refused (storage full, storage blocked), shown once in the
 * page frame. Every save path reports here: the text boxes, the action buttons, and any
 * database promise nobody awaited.
 */
export type SaveFailure = 'quota' | 'other'

let current: SaveFailure | null = null
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Only the database's own errors: a rejected video play() or fetch is not a refused save. */
const isStorageError = (e: unknown) => e instanceof Dexie.DexieError

const kindOf = (e: unknown): SaveFailure =>
  /quota/i.test(
    String((e as { name?: string })?.name ?? '') + String((e as { inner?: { name?: string } })?.inner?.name),
  )
    ? 'quota'
    : 'other'

/** Records a failed write. Errors after a wipe or import in another tab are expected and ignored. */
export function reportSaveError(e: unknown) {
  if (writesFrozen()) return
  console.error(e)
  current = kindOf(e)
  emit()
}

export function dismissSaveError() {
  current = null
  emit()
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
const snapshot = () => current

export function useSaveError(): SaveFailure | null {
  return useSyncExternalStore(subscribe, snapshot)
}

/** Catches database writes that nobody awaited (a tap on a chip, a checkbox). Called once at start-up. */
export function installSaveErrorReporting() {
  window.addEventListener('unhandledrejection', (ev) => {
    if (!isStorageError(ev.reason)) return
    ev.preventDefault()
    reportSaveError(ev.reason)
  })
}
