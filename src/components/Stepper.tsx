import { useState } from 'react'
import { useT } from '../i18n'

/**
 * Themed replacement for a native number spinner: minus, value, plus. While the box is typed
 * in it shows what was typed ("2" on the way to "21" stays "2", it does not jump to the
 * minimum), and the value brought into range is applied with every keystroke, so whatever
 * depends on it (a warning under the field) is already in place when the box is left; the
 * box shows the applied value again on Enter or when left. A text box with a numeric
 * keyboard, so the mouse wheel never changes it.
 */
export default function Stepper({
  id,
  value,
  min,
  max,
  step = 1,
  onChange,
  suffix,
}: {
  id: string
  value: number
  min: number
  max: number
  step?: number
  onChange: (v: number) => void
  suffix?: string
}) {
  const { t } = useT()
  const [draft, setDraft] = useState<string | null>(null)
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  const set = (v: number) => {
    setDraft(null)
    if (v !== value) onChange(v)
  }
  const commit = () => setDraft(null)
  return (
    <div className="stepper" role="group">
      <button
        type="button"
        className="btn sm"
        aria-label={t('common.less')}
        onClick={() => set(clamp(value - step))}
        disabled={value <= min}
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        role="spinbutton"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        value={draft ?? String(value)}
        onChange={(e) => {
          const typed = e.target.value.replace(/\D/g, '').slice(0, String(max).length + 1)
          setDraft(typed)
          const n = clamp(Number(typed))
          if (typed !== '' && n !== value) onChange(n)
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault()
            set(clamp(value + (e.key === 'ArrowUp' ? step : -step)))
          }
        }}
      />
      <button
        type="button"
        className="btn sm"
        aria-label={t('common.more')}
        onClick={() => set(clamp(value + step))}
        disabled={value >= max}
      >
        +
      </button>
      {suffix && <span className="small muted">{suffix}</span>}
    </div>
  )
}
