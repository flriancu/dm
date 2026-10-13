import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import DateField from '../../components/DateField'
import SectionHead from '../../components/SectionHead'
import { addMonths } from '../../lib/dates'
import { letterIcs, downloadText as download } from '../../lib/ics'
import { today, type VisionDoc } from '../../db/db'

/** Module 6: the letter from the future self, sealed until a delivery date, with its calendar file (FR-41). */
const LETTER_QS = ['where', 'doing', 'feel', 'built', 'stopped', 'mattered', 'advice'] as const

export default function Letter({ v, save }: { v: VisionDoc; save: (patch: Partial<VisionDoc>) => Promise<unknown> }) {
  const { t, fmtDate } = useT()
  const L = v.letter ?? {}
  const minDate = addMonths(today(), 3),
    maxDate = addMonths(today(), 12)
  const [deliver, setDeliver] = useState(L.deliverDate ?? addMonths(today(), 6))
  const sealed = !!L.sealed && !L.opened && (L.deliverDate ?? '') > today()
  const seal = () => save({ letter: { sealed: true, deliverDate: deliver, sealedOn: today(), opened: false } })
  const openAnyway = () => save({ letter: { opened: true } })
  return (
    <>
      <SectionHead id="letter" label={t('vision.section.letter')} title={t('letter.title')} />
      {sealed ? (
        <div className="card soft">
          <p style={{ margin: 0 }}>
            <strong>{t('letter.sealedUntil', { date: fmtDate(L.deliverDate!) })}</strong>
          </p>
          <p className="small muted">{t('letter.sealed.help')}</p>
          <div className="row">
            <button
              className="btn"
              onClick={() =>
                download(
                  'scrisoarea.ics',
                  letterIcs(L.deliverDate ?? deliver, t('letter.ics.title'), t('letter.ics.body')),
                )
              }
            >
              {t('letter.ics')}
            </button>
            <button className="btn ghost" onClick={openAnyway}>
              {t('letter.openAnyway')}
            </button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {t('letter.ics.help')}
          </p>
        </div>
      ) : (
        <>
          {L.sealed && <p className="notice small">{t('letter.delivered', { date: fmtDate(L.deliverDate!) })}</p>}
          <p className="muted small">{t('letter.help')}</p>
          <div className="card">
            <ol className="small" style={{ margin: '0 0 8px', paddingLeft: '1.3rem' }}>
              {LETTER_QS.map((q) => (
                <li key={q}>{t(`letter.q.${q}`)}</li>
              ))}
            </ol>
            <div className="field">
              <label htmlFor="letter-text">{t('letter.text')}</label>
              <AutoText
                id="letter-text"
                style={{ minHeight: 220 }}
                placeholder={t('letter.text.placeholder')}
                value={L.text ?? ''}
                onSave={(v) => save({ letter: { text: v } })}
                multiline
              />
            </div>
            <div className="field">
              <label htmlFor="letter-reply">{t('letter.reply')}</label>
              <AutoText
                id="letter-reply"
                style={{ minHeight: 120 }}
                placeholder={t('letter.reply.placeholder')}
                value={L.reply ?? ''}
                onSave={(v) => save({ letter: { reply: v } })}
                multiline
              />
            </div>
            {!L.sealed && (
              <>
                <div className="field">
                  <label htmlFor="letter-date">{t('letter.date')}</label>
                  <DateField id="letter-date" min={minDate} max={maxDate} value={deliver} onChange={setDeliver} />
                  <p className="small muted" style={{ margin: 0 }}>
                    {t('letter.date.help')}
                  </p>
                </div>
                <button
                  className="btn primary"
                  onClick={seal}
                  disabled={!(L.text ?? '').trim() || deliver < minDate || deliver > maxDate}
                >
                  {t('letter.seal')}
                </button>
              </>
            )}
          </div>
        </>
      )}
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/letter">{t('letter.print')}</Link>
      </p>
    </>
  )
}
