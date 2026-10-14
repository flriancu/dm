import { useCallback, useEffect, useRef, useState } from 'react'
import { TEXT_LONG, TEXT_SHORT } from '../db/db'
import type { TextField } from '../db/fields'
import { dropUnsaved, keepUnsaved } from '../db/journal'
import { reportSaveError } from '../state/saveErrors'

interface Props {
  id?: string
  value: string
  /** where the text is saved (src/db/fields.ts) */
  field: TextField
  placeholder?: string
  multiline?: boolean
  maxLength?: number
  style?: React.CSSProperties
  'aria-label'?: string
  delay?: number
  maxWait?: number
}

/**
 * A text box that saves by itself: a short pause after typing, at least every `maxWait` ms
 * while typing goes on, on blur, when it unmounts (a tap on a nav link does not always blur
 * first), and when the page is hidden. The save goes to the field of the moment the edit
 * started, so a change of dream or row under the box never redirects the text.
 *
 * Until it is stored, the text is also kept in the unsaved-text journal (synchronous, so a
 * reload, a closed tab or a killed tab cannot lose it); the next start writes it, unless the
 * field changed meanwhile. A late live-query update never wipes the text being typed; a save
 * the browser refuses keeps the text, marks the box and is tried again on the next blur.
 */
export default function AutoText({
  id,
  value,
  field,
  placeholder,
  multiline,
  maxLength = multiline ? TEXT_LONG : TEXT_SHORT,
  style,
  delay = 500,
  maxWait = 2000,
  ...rest
}: Props) {
  const [text, setText] = useState(value)
  const [failed, setFailed] = useState(false)
  const dirty = useRef(false)
  const since = useRef(0)
  /** the edit under way: its field, the stored value it builds on, and the text in flight to the database */
  const edit = useRef<{ field: TextField; base: string; sent?: string } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const typed = useRef(text)
  const known = useRef(value) // what the field holds in the database, as far as this box knows
  useEffect(() => {
    typed.current = text
  })

  // adopt outside changes only while the box is not being edited
  useEffect(() => {
    known.current = value
    if (!dirty.current) setText(value)
  }, [value])

  /** The journal entry of the edit under way, kept in step with what is typed, stored and in flight. */
  const journal = (e: { field: TextField; base: string; sent?: string }) =>
    keepUnsaved(e.field.key, { text: typed.current, base: e.base, sent: e.sent })

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    const e = edit.current
    if (!dirty.current || !e) return
    const v = typed.current
    dirty.current = false
    e.sent = v
    journal(e)
    const stored = () => {
      known.current = v
      const cur = edit.current
      if (cur?.field.key !== e.field.key) {
        dropUnsaved(e.field.key, v) // the box moved on (unmounted, another field): only this text was pending
      } else {
        cur.base = v // the field now holds v: whatever is typed next builds on it
        if (cur.sent === v) cur.sent = undefined
        if (dirty.current || cur.sent !== undefined) journal(cur)
        else {
          edit.current = null
          dropUnsaved(e.field.key, v)
        }
      }
      setFailed(false)
    }
    const fail = (err: unknown) => {
      // the journal still holds the text; the next blur or keystroke tries again
      if (edit.current === e) dirty.current = true
      setFailed(true)
      reportSaveError(err)
    }
    try {
      e.field.write(v).then(stored, fail)
    } catch (err) {
      fail(err)
    }
  }, [])

  useEffect(() => {
    const onHidden = () => document.visibilityState === 'hidden' && flush()
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onHidden)
      flush()
      edit.current = null // unmounted: whatever is not stored yet stays in the journal for the next start
    }
  }, [flush])

  const change = (v: string) => {
    // the box now shows another field (a reused component): what was typed for the old one goes there first
    if (edit.current && edit.current.field.key !== field.key) {
      flush()
      edit.current = null
    }
    setText(v)
    typed.current = v
    if (!edit.current) edit.current = { field, base: known.current }
    if (!dirty.current) {
      dirty.current = true
      since.current = Date.now()
    }
    journal(edit.current)
    window.clearTimeout(timer.current)
    const wait = Math.min(delay, Math.max(0, maxWait - (Date.now() - since.current)))
    timer.current = window.setTimeout(flush, wait)
  }

  const common = {
    id,
    value: text,
    placeholder,
    maxLength,
    style,
    onBlur: flush,
    className: failed ? 'unsaved' : undefined,
    'aria-invalid': failed || undefined,
    'aria-label': rest['aria-label'],
  }
  return multiline ? (
    <textarea {...common} onChange={(e) => change(e.target.value)} />
  ) : (
    <input type="text" {...common} onChange={(e) => change(e.target.value)} />
  )
}
