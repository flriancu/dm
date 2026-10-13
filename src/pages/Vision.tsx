import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import { db, today, VISION_SECTIONS, type VisionDoc, type ValueItem } from '../db/db'

/** Modules 6–7: values, the letter from the future self, the vision worksheet (FR-40..43). */
const LETTER_QS = ['where', 'doing', 'feel', 'built', 'stopped', 'mattered', 'advice'] as const

export function emptyVision(): VisionDoc {
  return { id: 'me', values: Array.from({ length: 10 }, () => ({ text: '' })), valueActs: [], worksheet: {}, updated: today() }
}

function addMonths(iso: string, m: number) { const d = new Date(iso + 'T00:00:00'); d.setMonth(d.getMonth() + m); return d.toISOString().slice(0, 10) }

/** iCalendar file for the letter's delivery date (FR-41). */
export function letterIcs(date: string, title: string, body: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const d = date.replace(/-/g, '')
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cartea Visurilor//RO', 'BEGIN:VEVENT', `UID:letter-${d}@cartea-visurilor`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(body)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}

export default function Vision() {
  const { t, fmtDate } = useT()
  const doc = useLiveQuery(() => db.vision.get('me'), [])
  const v = doc ?? emptyVision()
  const save = (patch: Partial<VisionDoc>) => db.transaction('rw', db.vision, async () => {
    const cur = (await db.vision.get('me')) ?? emptyVision()
    await db.vision.put({ ...cur, ...patch, worksheet: { ...(cur.worksheet ?? {}), ...(patch.worksheet ?? {}) }, letter: patch.letter ? { ...(cur.letter ?? {}), ...patch.letter } : cur.letter, updated: today() })
  })

  // values
  const setValue = (i: number, p: Partial<ValueItem>) => { const n = v.values.map((x) => ({ ...x })); n[i] = { ...n[i], ...p }; save({ values: n }) }
  const chosenCount = v.values.filter((x) => x.chosen).length
  const [act, setAct] = useState(''); const [actValue, setActValue] = useState('')
  const addAct = async () => { if (!act.trim()) return; await save({ valueActs: [...v.valueActs, { date: today(), value: actValue, text: act.trim() }] }); setAct('') }

  // letter
  const L = v.letter ?? {}
  const minDate = addMonths(today(), 3), maxDate = addMonths(today(), 12)
  const [deliver, setDeliver] = useState(L.deliverDate ?? addMonths(today(), 6))
  const sealed = !!L.sealed && !L.opened && (L.deliverDate ?? '') > today()
  const seal = () => save({ letter: { sealed: true, deliverDate: deliver, sealedOn: today(), opened: false } })
  const openAnyway = () => save({ letter: { opened: true } })
  const downloadIcs = () => {
    const blob = new Blob([letterIcs(L.deliverDate ?? deliver, t('letter.ics.title'), t('letter.ics.body'))], { type: 'text/calendar' })
    const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'scrisoarea.ics'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <>
      <h1>{t('vision.title')}</h1>
      <p className="muted">{t('vision.intro')}</p>
      <div className="card soft">
        <div className="row small" style={{ gap: '4px 12px' }}>
          <a href="#values">{t('vision.section.values')}</a>
          <a href="#letter">{t('vision.section.letter')}</a>
          <a href="#sheet">{t('vision.section.sheet')}</a>
        </div>
      </div>

      {/* values */}
      <p className="small muted" id="values" style={{ marginBottom: -8, marginTop: 28 }}>{t('vision.section.values')}</p>
      <h2 style={{ marginTop: 12 }}>{t('values.title')} <span className="small muted" style={{ fontWeight: 400 }}>· {t('values.chosen', { n: chosenCount })}</span></h2>
      <p className="muted small">{t('values.help')}</p>
      <div className="card">
        {v.values.map((x, i) => (
          <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
            <input type="text" aria-label={t('values.n', { n: i + 1 })} placeholder={t(`values.placeholder.${(i % 5) + 1}`)} defaultValue={x.text} onBlur={(e) => setValue(i, { text: e.target.value })} style={{ flex: 1 }} />
            <button className={`chip ${x.chosen ? 'on' : ''}`} onClick={() => setValue(i, { chosen: !x.chosen, nonNegotiable: x.chosen ? false : x.nonNegotiable })} disabled={!x.chosen && chosenCount >= 5} aria-pressed={!!x.chosen} aria-label={t('values.choose')} title={t('values.choose')}>{x.chosen ? '★' : '☆'}</button>
            {x.chosen && <button className={`chip ${x.nonNegotiable ? 'on' : ''}`} onClick={() => setValue(i, { nonNegotiable: !x.nonNegotiable })} aria-pressed={!!x.nonNegotiable} aria-label={t('values.nonneg')} title={t('values.nonneg')}>{t('values.nonneg.short')}</button>}
          </div>
        ))}
        <p className="small muted">{t('values.legend')}</p>
      </div>
      <h3>{t('values.acts')}</h3>
      <p className="muted small">{t('values.acts.help')}</p>
      <div className="card">
        <div className="field">
          <label htmlFor="act-value">{t('values.acts.which')}</label>
          <select id="act-value" value={actValue} onChange={(e) => setActValue(e.target.value)}>
            <option value="">{t('values.acts.which.none')}</option>
            {v.values.filter((x) => x.chosen && x.text).map((x) => <option key={x.text} value={x.text}>{x.text}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="act-text">{t('values.acts.what')}</label>
          <input id="act-text" type="text" placeholder={t('values.acts.placeholder')} value={act} onChange={(e) => setAct(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAct()} />
        </div>
        <button className="btn" onClick={addAct} disabled={!act.trim()}>{t('values.acts.add')}</button>
        {v.valueActs.length > 0 && <ul className="list small">{[...v.valueActs].reverse().map((a, i) => <li key={i}><span className="muted">{fmtDate(a.date)}</span> · <strong>{a.value}</strong> — {a.text}</li>)}</ul>}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/values">{t('values.print')}</Link></p>

      {/* letter */}
      <p className="small muted" id="letter" style={{ marginBottom: -8, marginTop: 28 }}>{t('vision.section.letter')}</p>
      <h2 style={{ marginTop: 12 }}>{t('letter.title')}</h2>
      {sealed ? (
        <div className="card soft">
          <p style={{ margin: 0 }}><strong>{t('letter.sealedUntil', { date: fmtDate(L.deliverDate!) })}</strong></p>
          <p className="small muted">{t('letter.sealed.help')}</p>
          <div className="row">
            <button className="btn" onClick={downloadIcs}>{t('letter.ics')}</button>
            <button className="btn ghost" onClick={openAnyway}>{t('letter.openAnyway')}</button>
          </div>
          <p className="small muted" style={{ margin: 0 }}>{t('letter.ics.help')}</p>
        </div>
      ) : (
        <>
          {L.sealed && <p className="notice small">{t('letter.delivered', { date: fmtDate(L.deliverDate!) })}</p>}
          <p className="muted small">{t('letter.help')}</p>
          <div className="card">
            <ol className="small" style={{ margin: '0 0 8px', paddingLeft: '1.3rem' }}>{LETTER_QS.map((q) => <li key={q}>{t(`letter.q.${q}`)}</li>)}</ol>
            <div className="field">
              <label htmlFor="letter-text">{t('letter.text')}</label>
              <textarea id="letter-text" style={{ minHeight: 220 }} placeholder={t('letter.text.placeholder')} defaultValue={L.text ?? ''} onBlur={(e) => save({ letter: { text: e.target.value } })} />
            </div>
            <div className="field">
              <label htmlFor="letter-reply">{t('letter.reply')}</label>
              <textarea id="letter-reply" style={{ minHeight: 120 }} placeholder={t('letter.reply.placeholder')} defaultValue={L.reply ?? ''} onBlur={(e) => save({ letter: { reply: e.target.value } })} />
            </div>
            {!L.sealed && (
              <>
                <div className="field">
                  <label htmlFor="letter-date">{t('letter.date')}</label>
                  <input id="letter-date" type="date" min={minDate} max={maxDate} value={deliver} onChange={(e) => setDeliver(e.target.value)} />
                  <p className="small muted" style={{ margin: 0 }}>{t('letter.date.help')}</p>
                </div>
                <button className="btn primary" onClick={seal} disabled={!(L.text ?? '').trim() || deliver < minDate || deliver > maxDate}>{t('letter.seal')}</button>
              </>
            )}
          </div>
        </>
      )}
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/letter">{t('letter.print')}</Link></p>

      {/* worksheet */}
      <p className="small muted" id="sheet" style={{ marginBottom: -8, marginTop: 28 }}>{t('vision.section.sheet')}</p>
      <h2 style={{ marginTop: 12 }}>{t('sheet.title')}</h2>
      <p className="muted small">{t('sheet.help')}</p>
      {VISION_SECTIONS.map((s, i) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`vs-${s}`}><span className="chip small" style={{ marginRight: 6 }}>{t('home.module')} {i < 4 ? 6 : 7}</span> <strong>{i + 1}. {t(`sheet.${s}`)}</strong> — {t(`sheet.${s}.q`)}</label>
            <textarea id={`vs-${s}`} placeholder={t(`sheet.${s}.placeholder`)} defaultValue={v.worksheet[s] ?? ''} onBlur={(e) => save({ worksheet: { [s]: e.target.value } })} />
          </div>
        </div>
      ))}
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/sheet">{t('sheet.print')}</Link></p>
    </>
  )
}
