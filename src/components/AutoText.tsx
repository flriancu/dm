import { useCallback, useEffect, useRef, useState } from 'react'
import { TEXT_LONG, TEXT_SHORT } from '../db/db'
import { reportSaveError } from '../state/saveErrors'
import { setPending } from '../state/pendingSaves'

interface Props {
  id?: string
  value: string
  onSave: (v: string) => unknown
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
 * first), and when the page is hidden or closed. The save goes to the `onSave` of the moment
 * the edit started, so a change of dream or row under the box never redirects the text. Keeps
 * the typed text while a save is pending, so a late live-query update never wipes it; a save
 * the browser refuses keeps the text, marks the box and is retried on the next blur. While
 * text is not stored yet, leaving the page asks the browser to wait for it (pendingSaves).
 */
export default function AutoText({
  id,
  value,
  onSave,
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
  const target = useRef<Props['onSave'] | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const typed = useRef(text)
  const box = useRef(Symbol('AutoText'))
  useEffect(() => {
    typed.current = text
  })

  // adopt outside changes only while the box is not being edited
  useEffect(() => {
    if (!dirty.current) setText(value)
  }, [value])

  const flush = useCallback(() => {
    window.clearTimeout(timer.current)
    if (!dirty.current || !target.current) return
    const save = target.current
    const v = typed.current
    dirty.current = false
    target.current = null
    const fail = (e: unknown) => {
      if (!dirty.current) {
        dirty.current = true // retried on the next blur, or with the next keystroke
        target.current = save
      }
      setFailed(true)
      reportSaveError(e)
    }
    const stored = () => {
      setFailed(false)
      if (!dirty.current) setPending(box.current, null)
    }
    try {
      Promise.resolve(save(v)).then(stored, fail)
    } catch (e) {
      fail(e)
    }
  }, [])

  useEffect(() => {
    const onHidden = () => document.visibilityState === 'hidden' && flush()
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onHidden)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onHidden)
      flush()
    }
  }, [flush])

  const change = (v: string) => {
    setText(v)
    typed.current = v
    if (!dirty.current) {
      dirty.current = true
      since.current = Date.now()
      target.current = onSave
      setPending(box.current, flush)
    }
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
