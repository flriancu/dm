import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import SectionHead from '../../components/SectionHead'
import { addMonths } from '../../lib/dates'
import { dateIcs, downloadText as download } from '../../lib/ics'
import { today, type VisionDoc } from '../../db/db'

/** The periodic vision check-in: cadence, next date with its calendar file, the steps and the log (FR-45). */
const CHECKIN_STEPS = ['vision', 'wheel', 'dreams', 'directions', 'yesno', 'letgo'] as const

export default function Checkin({ v, save }: { v: VisionDoc; save: (patch: Partial<VisionDoc>) => Promise<unknown> }) {
  const { t, fmtDate } = useT()
  const C = v.checkin ?? {}
  const every = C.everyMonths ?? 3
  const setEvery = (m: 3 | 6) => save({ checkin: { everyMonths: m, next: addMonths(C.lastDone ?? today(), m) } })
  const [checkNote, setCheckNote] = useState('')
  const doneCheckin = async () => {
    const log = [...(C.log ?? []), { date: today(), note: checkNote.trim() }]
    await save({ checkin: { log, lastDone: today(), next: addMonths(today(), every) } })
    setCheckNote('')
  }
  const due = !!C.next && C.next <= today()
  return (
    <>
      <SectionHead id="checkin" label={t('vision.section.checkin')} title={t('checkin.title')} />
      <p className="muted small">{t('checkin.help')}</p>
      <div className={`card ${due ? 'soft' : ''}`}>
        <div className="field">
          <label>{t('checkin.every')}</label>
          <div className="row">
            {([3, 6] as const).map((m) => (
              <button key={m} className={`chip ${every === m && C.next ? 'on' : ''}`} onClick={() => setEvery(m)}>
                {t(`checkin.every.${m}`)}
              </button>
            ))}
          </div>
        </div>
        {C.next ? (
          <>
            <p style={{ margin: 0 }}>
              <strong>{due ? t('checkin.due') : t('checkin.next', { date: fmtDate(C.next) })}</strong>
            </p>
            <button
              className="btn"
              onClick={() =>
                download(
                  'verificarea-viziunii.ics',
                  dateIcs(C.next!, 'checkin', t('checkin.ics.title'), t('checkin.ics.body')),
                )
              }
            >
              {t('letter.ics')}
            </button>
            <p className="small muted" style={{ margin: 0 }}>
              {t('letter.ics.help')}
            </p>
          </>
        ) : (
          <p className="small muted" style={{ margin: 0 }}>
            {t('checkin.none')}
          </p>
        )}
      </div>
      <h3>{t('checkin.steps')}</h3>
      <div className="card">
        <ol style={{ margin: 0, paddingLeft: '1.3rem' }}>
          {CHECKIN_STEPS.map((s) => (
            <li key={s}>{t(`checkin.step.${s}`)}</li>
          ))}
        </ol>
        <div className="field">
          <label htmlFor="checkin-note">{t('checkin.note')}</label>
          <textarea
            id="checkin-note"
            placeholder={t('checkin.note.placeholder')}
            value={checkNote}
            onChange={(e) => setCheckNote(e.target.value)}
            style={{ minHeight: 72 }}
          />
        </div>
        <button className="btn primary" onClick={doneCheckin} disabled={!C.next}>
          {t('checkin.done')}
        </button>
        {(C.log ?? []).length > 0 && (
          <ul className="list small">
            {[...(C.log ?? [])].reverse().map((l, i) => (
              <li key={i}>
                <span className="muted">{fmtDate(l.date)}</span> — {l.note || t('checkin.noNote')}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/checkin">{t('checkin.print')}</Link>
      </p>
    </>
  )
}
