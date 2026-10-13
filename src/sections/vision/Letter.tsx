import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import DateField from '../../components/DateField'
import SectionHead from '../../components/SectionHead'
import { addMonths } from '../../lib/dates'
import { letterIcs, downloadText as download } from '../../lib/ics'
import { letterState } from '../../lib/course'
import { saveVision, sealLetter, openLetter, startNewLetter } from '../../db/vision'
import { useAction } from '../../state/useAction'
import { useToday } from '../../state/useToday'
import { LETTER_QUESTIONS, type Letter as LetterDoc, type VisionDoc } from '../../db/db'

/** Module 6: the letter from the future self, sealed until a delivery date, with its calendar file (FR-41). */

export default function Letter({ v }: { v: VisionDoc }) {
  const { t, fmtDate } = useT()
  const now = useToday()
  const L = v.letter ?? {}
  const state = letterState(L, now)
  const minDate = addMonths(now, 3),
    maxDate = addMonths(now, 12)
  const [deliver, setDeliver] = useState(L.deliverDate ?? addMonths(now, 6))
  const [seal, sealing] = useAction(() => sealLetter(deliver))
  const [read, reading] = useAction(openLetter)
  const [restart, restarting] = useAction(async () => {
    if (!confirm(t('letter.new.confirm'))) return
    await startNewLetter()
    setDeliver(addMonths(now, 6)) // the new letter's own date, not the old one's (which has passed)
  })

  const reply = (
    <div className="field">
      <label htmlFor="letter-reply">{t('letter.reply')}</label>
      <AutoText
        id="letter-reply"
        style={{ minHeight: 120 }}
        placeholder={t('letter.reply.placeholder')}
        value={L.reply ?? ''}
        onSave={(text) => saveVision({ letter: { reply: text } })}
        multiline
      />
    </div>
  )

  return (
    <>
      <SectionHead id="letter" label={t('vision.section.letter')} title={t('letter.title')} />
      {state === 'sealed' ? (
        <div className="card soft">
          <p style={{ margin: 0 }}>
            <strong>{t('letter.sealedUntil', { date: fmtDate(L.deliverDate!) })}</strong>
          </p>
          <p className="small muted">{t('letter.sealed.help')}</p>
          <div className="row">
            <button
              className="btn"
              onClick={() =>
                download('scrisoarea.ics', letterIcs(L.deliverDate!, t('letter.ics.title'), t('letter.ics.body')))
              }
            >
              {t('letter.ics')}
            </button>
            <button className="btn ghost" onClick={() => read()} disabled={reading}>
              {t('letter.openAnyway')}
            </button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>
            {t('letter.ics.help')}
          </p>
        </div>
      ) : state === 'arrived' || state === 'read' ? (
        <div className="card">
          {L.sealed && L.deliverDate && (
            <p className="notice small">{t('letter.delivered', { date: fmtDate(L.deliverDate) })}</p>
          )}
          {state === 'read' && L.openedOn && (
            <p className="small muted">{t('letter.readOn', { date: fmtDate(L.openedOn) })}</p>
          )}
          <div className="letter-text">{L.text}</div>
          {reply}
          {state === 'arrived' ? (
            <button className="btn primary" onClick={() => read()} disabled={reading}>
              {t('letter.read')}
            </button>
          ) : (
            <button className="btn" onClick={() => restart()} disabled={restarting}>
              {t('letter.new')}
            </button>
          )}
        </div>
      ) : (
        <>
          <p className="muted small">{t('letter.help')}</p>
          <div className="card">
            <ol className="small" style={{ margin: '0 0 8px', paddingLeft: '1.3rem' }}>
              {LETTER_QUESTIONS.map((q) => (
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
                onSave={(text) => saveVision({ letter: { text } })}
                multiline
              />
            </div>
            {reply}
            <div className="field">
              <label htmlFor="letter-date">{t('letter.date')}</label>
              <DateField id="letter-date" min={minDate} max={maxDate} value={deliver} onChange={setDeliver} />
              <p className="small muted" style={{ margin: 0 }}>
                {t('letter.date.help')}
              </p>
            </div>
            <button
              className="btn primary"
              onClick={() => seal()}
              disabled={sealing || !(L.text ?? '').trim() || deliver < minDate || deliver > maxDate}
            >
              {t('letter.seal')}
            </button>
          </div>
        </>
      )}
      {(v.pastLetters ?? []).length > 0 && <PastLetters letters={v.pastLetters!} />}
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/letter">{t('letter.print')}</Link>
      </p>
    </>
  )
}

function PastLetters({ letters }: { letters: LetterDoc[] }) {
  const { t, fmtDate } = useT()
  return (
    <details className="card">
      <summary>{t('letter.past', { n: letters.length })}</summary>
      {letters.map((l, i) => (
        <div key={i} className="field">
          {l.openedOn && <p className="small muted">{t('letter.readOn', { date: fmtDate(l.openedOn) })}</p>}
          <div className="letter-text">{l.text}</div>
          {l.reply && <div className="letter-text small">{l.reply}</div>}
        </div>
      ))}
    </details>
  )
}
