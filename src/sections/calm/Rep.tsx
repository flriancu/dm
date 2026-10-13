import { useEffect, useRef, useState } from 'react'
import { useT } from '../../i18n'
import Transcript from '../../components/Transcript'
import SectionHead from '../../components/SectionHead'
import { useRepCount, addRep } from '../../db/calm'

/** Module 5: the short attention exercise with its countdown and counter, plus the two videos (FR-33). */
const SENSES = ['touch', 'sound', 'breath', 'sight', 'weight'] as const

/** The two Chamine recordings hosted with the course (D12): subtitles in both languages, transcript in Romanian. */
const VIDEOS = ['chamine-1', 'chamine-2'] as const

export default function Rep() {
  const { t } = useT()
  const [left, setLeft] = useState<number | null>(null)
  const [sense, setSense] = useState(0)
  const timer = useRef<number | null>(null)
  const remaining = useRef(0)
  const reps = useRepCount() ?? 0
  const stop = () => {
    if (timer.current) window.clearInterval(timer.current)
    timer.current = null
  }
  // the count lives in a ref and the save happens in the tick itself, never in a state updater
  // (React may run an updater twice, which counted every rep twice)
  const start = (secs: number) => {
    stop()
    setSense(Math.floor(Math.random() * SENSES.length))
    remaining.current = secs
    setLeft(secs)
    timer.current = window.setInterval(() => {
      remaining.current -= 1
      setLeft(Math.max(0, remaining.current))
      if (remaining.current <= 0) {
        stop()
        void addRep(secs)
      }
    }, 1000)
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
        {VIDEOS.map((v) => (
          <div key={v} className="field">
            <video controls preload="metadata" style={{ width: '100%', borderRadius: 8 }} src={`./media/${v}.mp4`}>
              <track kind="subtitles" srcLang="ro" label="Română" src={`./media/${v}.ro.vtt`} default />
              <track kind="subtitles" srcLang="en" label="English" src={`./media/${v}.en.vtt`} />
            </video>
            <Transcript src={`./media/${v}.ro.vtt`} label={t('rep.videos.transcript')} />
          </div>
        ))}
        <p className="small muted">{t('rep.videos.subtitles')}</p>
        <p className="small muted">{t('rep.videos.credit')}</p>
      </div>
    </>
  )
}
