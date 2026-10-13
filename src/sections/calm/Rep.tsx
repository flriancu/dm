import { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import SectionHead from '../../components/SectionHead'
import { useRepCount, addRep } from '../../db/calm'

/** Module 5: the short attention exercise with its countdown and counter, plus the two videos (FR-33). */
const SENSES = ['touch', 'sound', 'breath', 'sight', 'weight'] as const

export default function Rep() {
  const { t } = useT()
  const [left, setLeft] = useState<number | null>(null)
  const [sense, setSense] = useState(0)
  const timer = useRef<number | null>(null)
  const reps = useRepCount() ?? 0
  const start = (secs: number) => {
    if (timer.current) window.clearInterval(timer.current)
    setSense(Math.floor(Math.random() * SENSES.length))
    setLeft(secs)
    timer.current = window.setInterval(
      () =>
        setLeft((v) => {
          if (v === null) return null
          if (v <= 1) {
            window.clearInterval(timer.current!)
            timer.current = null
            addRep(secs)
            return 0
          }
          return v - 1
        }),
      1000,
    )
  }
  useEffect(
    () => () => {
      if (timer.current) window.clearInterval(timer.current)
    },
    [],
  )
  return (
    <>
      <SectionHead id="rep" label={t('calm.section.rep')} title={t('rep.title')} />
      <p className="muted small">{t('rep.help')}</p>
      <div className="card">
        <div className="row">
          {[10, 60, 120].map((s) => (
            <button key={s} className="btn" onClick={() => start(s)}>
              {t(`rep.start.${s}`)}
            </button>
          ))}
        </div>
        {left !== null && (
          <div className="card soft" aria-live="polite">
            <div style={{ fontSize: '2rem', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>
              {left > 0 ? `${left}` : '✓'}
            </div>
            <p style={{ margin: 0 }}>{left > 0 ? t(`rep.sense.${SENSES[sense]}`) : t('rep.done')}</p>
          </div>
        )}
        <p className="small muted">{t('rep.count', { n: reps })}</p>
      </div>
      <h3>{t('rep.videos')}</h3>
      <p className="muted small">{t('rep.videos.help')}</p>
      <div className="card">
        <video controls preload="metadata" style={{ width: '100%', borderRadius: 8 }} src="./media/chamine-1.mp4" />
        <video controls preload="metadata" style={{ width: '100%', borderRadius: 8 }} src="./media/chamine-2.mp4" />
        <p className="small muted">{t('rep.videos.credit')}</p>
      </div>
    </>
  )
}
