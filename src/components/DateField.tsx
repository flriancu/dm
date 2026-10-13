import { useEffect, useRef, useState } from 'react'
import { DayPicker } from '@daypicker/react'
import { ro, enUS } from '@daypicker/react/locale'
import '@daypicker/react/style.css'
import { useT } from '../i18n'
import { localIso, parseLocal } from '../lib/dates'
import { useToday } from '../state/useToday'

interface Props {
  id: string
  value: string
  onChange: (v: string) => void
  min?: string
  max?: string
}
const LOCALES = { ro, en: enUS } as const

/**
 * A date field in the site's own style: the whole box is a button that opens a month
 * calendar (DayPicker, localized, keyboard-accessible); the chosen date shows in words.
 * Values are local ISO dates (yyyy-mm-dd), never UTC.
 */
export default function DateField({ id, value, onChange, min, max }: Props) {
  const { t, fmtDate, locale } = useT()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLSpanElement>(null)
  const btn = useRef<HTMLButtonElement>(null)
  // closing with the keyboard or by picking a day hands focus back to the field, not to the page
  const close = (refocus: boolean) => {
    setOpen(false)
    if (refocus) btn.current?.focus()
  }

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const key = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOpen(false)
      btn.current?.focus()
    }
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', key)
    }
  }, [open])

  const pick = (v: string) => {
    onChange(v)
    close(true)
  }
  const now = useToday()
  const todayAllowed = (!min || now >= min) && (!max || now <= max)
  const selected = value ? parseLocal(value) : undefined

  return (
    <span
      className="datefield"
      ref={box}
      onBlur={(e) => {
        // Tab out of the calendar closes it (a click outside is handled above)
        if (open && e.relatedTarget && !box.current?.contains(e.relatedTarget as Node)) setOpen(false)
      }}
    >
      <button
        type="button"
        ref={btn}
        id={id}
        className={`datefield-btn ${value ? '' : 'empty'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{value ? fmtDate(value) : t('date.pick')}</span>
        <span className="datefield-ico" aria-hidden>
          📅
        </span>
      </button>
      {open && (
        <div className="datepop" role="dialog" aria-label={t('date.pick')}>
          <DayPicker
            mode="single"
            locale={LOCALES[locale as keyof typeof LOCALES] ?? ro}
            weekStartsOn={1}
            selected={selected}
            defaultMonth={
              selected ?? (min && now < min ? parseLocal(min) : max && now > max ? parseLocal(max) : undefined)
            }
            startMonth={min ? parseLocal(min) : undefined}
            endMonth={max ? parseLocal(max) : undefined}
            disabled={[...(min ? [{ before: parseLocal(min) }] : []), ...(max ? [{ after: parseLocal(max) }] : [])]}
            onSelect={(d) => {
              if (d) pick(localIso(d))
            }}
            labels={{ labelPrevious: () => t('date.prev'), labelNext: () => t('date.next') }}
          />
          <div className="row datepop-foot">
            {todayAllowed && (
              <button type="button" className="btn sm" onClick={() => pick(now)}>
                {t('date.today')}
              </button>
            )}
            {value && !min && (
              <button type="button" className="btn sm ghost" onClick={() => pick('')}>
                {t('date.clear')}
              </button>
            )}
            <button type="button" className="btn sm ghost" onClick={() => close(true)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </span>
  )
}
