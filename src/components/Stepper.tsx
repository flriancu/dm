import { useT } from '../i18n'

/** Themed replacement for a native number spinner: minus, value, plus. */
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
  const clamp = (v: number) => Math.max(min, Math.min(max, v))
  return (
    <div className="stepper" role="group">
      <button
        type="button"
        className="btn sm"
        aria-label={t('common.less')}
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
      >
        −
      </button>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!Number.isNaN(v)) onChange(clamp(v))
        }}
      />
      <button
        type="button"
        className="btn sm"
        aria-label={t('common.more')}
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
      >
        +
      </button>
      {suffix && <span className="small muted">{suffix}</span>}
    </div>
  )
}
