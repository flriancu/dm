import { useEffect, useRef, useState } from 'react'

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
}

/**
 * A text box that saves by itself: a short pause after typing, on blur, and when it
 * unmounts (a tap on a nav link does not always blur first). Keeps the typed text
 * while a save is pending, so a late live-query update never wipes it.
 */
export default function AutoText({ id, value, onSave, placeholder, multiline, maxLength, style, delay = 500, ...rest }: Props) {
  const [text, setText] = useState(value)
  const dirty = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const latest = useRef({ text, onSave })
  latest.current = { text, onSave }

  // adopt outside changes only while the box is not being edited
  useEffect(() => { if (!dirty.current) setText(value) }, [value])

  const flush = () => {
    window.clearTimeout(timer.current)
    if (!dirty.current) return
    dirty.current = false
    void latest.current.onSave(latest.current.text)
  }
  useEffect(() => () => flush(), [])   // eslint-disable-line react-hooks/exhaustive-deps

  const change = (v: string) => {
    setText(v); dirty.current = true
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(flush, delay)
  }

  const common = { id, value: text, placeholder, maxLength, style, onBlur: flush, 'aria-label': rest['aria-label'] }
  return multiline
    ? <textarea {...common} onChange={(e) => change(e.target.value)} />
    : <input type="text" {...common} onChange={(e) => change(e.target.value)} />
}
