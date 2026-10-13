import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { reportSaveError } from './saveErrors'

/**
 * Wraps a button's async action so a double click or a tap while the first save is still
 * running does it once. `pending` disables the button meanwhile; a failure is reported
 * instead of being lost. For buttons that save what is already on the page (a wheel, a seal,
 * "meeting held"); a form that adds what was typed uses submitDraft.
 */
export function useAction<A extends unknown[]>(fn: (...args: A) => Promise<unknown>) {
  const busy = useRef(false)
  const latest = useRef(fn)
  useEffect(() => {
    latest.current = fn
  })
  const [pending, setPending] = useState(false)
  const run = useCallback(async (...args: A) => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try {
      await latest.current(...args)
    } catch (e) {
      reportSaveError(e)
    } finally {
      busy.current = false
      setPending(false)
    }
  }, [])
  return [run, pending] as const
}

/**
 * Adds what was typed in a form (one box, or several fields in one draft object). The draft
 * is emptied at once, so a second Enter or click finds nothing to add twice and the next
 * entry can be typed straight away; if the browser refuses the save, the draft comes back
 * (unless something new was typed meanwhile) and the failure is reported.
 */
export function submitDraft<D>(
  draft: D,
  setDraft: Dispatch<SetStateAction<D>>,
  empty: D,
  save: (d: D) => Promise<unknown>,
  canSave: (d: D) => boolean,
) {
  return async () => {
    const d = draft
    if (!canSave(d)) return
    setDraft(empty)
    try {
      await save(d)
    } catch (e) {
      setDraft((cur) => (cur === empty ? d : cur))
      reportSaveError(e)
    }
  }
}
