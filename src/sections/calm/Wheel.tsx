import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import SectionHead from '../../components/SectionHead'
import { WheelSvg } from '../../components/WheelSvg'
import { useWheels, saveWheel } from '../../db/calm'
import { useAction } from '../../state/useAction'
import { WHEEL_AREAS, SWLS_ITEMS } from '../../db/db'

/** Module 5: the Wheel of Life sliders, the five SWLS statements, and the saved snapshots (FR-32, FR-34). */
export default function Wheel() {
  const { t, fmtDate } = useT()
  const snaps = useWheels() ?? []
  const last = snaps[0]
  const [values, setValues] = useState<number[]>(last?.values ?? Array(WHEEL_AREAS.length).fill(5))
  const [swls, setSwls] = useState<number[]>(last?.swls ?? Array(SWLS_ITEMS.length).fill(0))
  const [seeded, setSeeded] = useState(false)
  useEffect(() => {
    if (last && !seeded) {
      setValues(last.values)
      setSwls(last.swls)
      setSeeded(true)
    }
  }, [last, seeded])
  const total = swls.reduce((a, b) => a + b, 0)
  const [save, saving] = useAction(() => saveWheel(values, swls))
  return (
    <>
      <SectionHead id="wheel" label={t('calm.section.wheel')} title={t('wheel.title')} />
      <p className="muted small">{t('wheel.help')}</p>
      <div className="card">
        <WheelSvg values={values} />
        {WHEEL_AREAS.map((a, i) => (
          <div className="field" key={a}>
            <label htmlFor={`w-${a}`}>
              {t(`wheel.area.${a}`)} <strong>{values[i]}</strong>
            </label>
            <input
              id={`w-${a}`}
              type="range"
              min={0}
              max={10}
              value={values[i]}
              onChange={(e) => {
                const v = [...values]
                v[i] = Number(e.target.value)
                setValues(v)
              }}
            />
          </div>
        ))}
      </div>
      <h3>{t('swls.title')}</h3>
      <p className="muted small">{t('swls.help')}</p>
      <div className="card">
        {SWLS_ITEMS.map((k, i) => (
          <div className="field" key={k}>
            <label>{t(`swls.${k}`)}</label>
            <div className="row" role="radiogroup" aria-label={t(`swls.${k}`)}>
              {[1, 2, 3, 4, 5, 6, 7].map((v) => (
                <button
                  key={v}
                  className={`chip ${swls[i] === v ? 'on' : ''}`}
                  onClick={() => {
                    const s = [...swls]
                    s[i] = v
                    setSwls(s)
                  }}
                  aria-pressed={swls[i] === v}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        ))}
        <p className="small muted">
          {t('swls.scale')} · {t('swls.total', { n: total })}
        </p>
      </div>
      <p>
        <button className="btn primary" onClick={() => save()} disabled={saving || swls.some((v) => v === 0)}>
          {t('wheel.save')}
        </button>
      </p>
      {snaps.length > 0 && (
        <div className="card">
          <div className="small muted">{t('wheel.history')}</div>
          <ul className="list small">
            {snaps.map((s) => (
              <li key={s.id}>
                {fmtDate(s.date)} ·{' '}
                {t('wheel.avg', { n: (s.values.reduce((a, b) => a + b, 0) / s.values.length).toFixed(1) })} ·{' '}
                {t('swls.total', { n: s.swls.reduce((a, b) => a + b, 0) })}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/wheel">{t('wheel.print')}</Link>
      </p>
    </>
  )
}
