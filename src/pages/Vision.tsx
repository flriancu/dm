import DreamerOnly from '../components/DreamerOnly'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import AutoText from '../components/AutoText'
import { db, today, VISION_SECTIONS, REGRET_AREAS, type VisionDoc, type ValueItem, type RegretArea } from '../db/db'

/** Modules 6–7: values, the letter from the future self, the vision worksheet, regret and Yes/No, the check-in, the retrospective. */
const LETTER_QS = ['where', 'doing', 'feel', 'built', 'stopped', 'mattered', 'advice'] as const
const CHECKIN_STEPS = ['vision', 'wheel', 'dreams', 'directions', 'yesno', 'letgo'] as const

export function emptyVision(): VisionDoc {
  return { id: 'me', values: Array.from({ length: 10 }, () => ({ text: '' })), valueActs: [], worksheet: {}, updated: today() }
}

import { addMonths } from '../lib/dates'

import { dateIcs, letterIcs, downloadText as download } from '../lib/ics'
import { saveDoc } from '../db/docs'

const VISION_DOC = { table: db.vision, key: 'me' as const, empty: emptyVision, nested: ['worksheet', 'letter', 'regret', 'yesno', 'checkin', 'retro'] as const }

function SectionHead({ id, label, title, right }: { id: string; label: string; title: string; right?: string }) {
  return (
    <>
      <p className="small muted" id={id} style={{ marginBottom: -8, marginTop: 28 }}>{label}</p>
      <h2 style={{ marginTop: 12 }}>{title}{right && <span className="small muted" style={{ fontWeight: 400 }}> · {right}</span>}</h2>
    </>
  )
}

export default function VisionPage() {
  return <DreamerOnly><Vision /></DreamerOnly>
}

function Vision() {
  const { t, fmtDate } = useT()
  const doc = useLiveQuery(() => db.vision.get('me'), [])
  const notes = useLiveQuery(() => db.moduleNotes.orderBy('moduleId').toArray(), []) ?? []
  const v = doc ?? emptyVision()
  const save = (patch: Partial<VisionDoc>) => saveDoc(VISION_DOC, patch)

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

  // check-in
  const C = v.checkin ?? {}
  const every = C.everyMonths ?? 3
  const setEvery = (m: 3 | 6) => save({ checkin: { everyMonths: m, next: addMonths(C.lastDone ?? today(), m) } })
  const [checkNote, setCheckNote] = useState('')
  const doneCheckin = async () => {
    const log = [...(C.log ?? []), { date: today(), note: checkNote.trim() }]
    await save({ checkin: { log, lastDone: today(), next: addMonths(today(), every) } }); setCheckNote('')
  }
  const due = !!C.next && C.next <= today()

  return (
    <>
      <h1>{t('vision.title')}</h1>
      <p className="muted">{t('vision.intro')}</p>
      <div className="card soft">
        <div className="row small" style={{ gap: '4px 12px' }}>
          <a href="#values">{t('vision.section.values')}</a>
          <a href="#letter">{t('vision.section.letter')}</a>
          <a href="#sheet">{t('vision.section.sheet')}</a>
          <a href="#regret">{t('vision.section.regret')}</a>
          <a href="#checkin">{t('vision.section.checkin')}</a>
          <a href="#retro">{t('vision.section.retro')}</a>
        </div>
      </div>

      {/* values */}
      <SectionHead id="values" label={t('vision.section.values')} title={t('values.title')} right={t('values.chosen', { n: chosenCount })} />
      <p className="muted small">{t('values.help')}</p>
      <div className="card">
        {v.values.map((x, i) => (
          <div className="row" key={i} style={{ flexWrap: 'nowrap' }}>
            <AutoText aria-label={t('values.n', { n: i + 1 })} placeholder={t(`values.placeholder.${(i % 5) + 1}`)} style={{ flex: 1 }} value={x.text} onSave={(v) => setValue(i, { text: v })} />
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
      <SectionHead id="letter" label={t('vision.section.letter')} title={t('letter.title')} />
      {sealed ? (
        <div className="card soft">
          <p style={{ margin: 0 }}><strong>{t('letter.sealedUntil', { date: fmtDate(L.deliverDate!) })}</strong></p>
          <p className="small muted">{t('letter.sealed.help')}</p>
          <div className="row">
            <button className="btn" onClick={() => download('scrisoarea.ics', letterIcs(L.deliverDate ?? deliver, t('letter.ics.title'), t('letter.ics.body')))}>{t('letter.ics')}</button>
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
              <AutoText id="letter-text" style={{ minHeight: 220 }} placeholder={t('letter.text.placeholder')} value={L.text ?? ''} onSave={(v) => save({ letter: { text: v } })} multiline />
            </div>
            <div className="field">
              <label htmlFor="letter-reply">{t('letter.reply')}</label>
              <AutoText id="letter-reply" style={{ minHeight: 120 }} placeholder={t('letter.reply.placeholder')} value={L.reply ?? ''} onSave={(v) => save({ letter: { reply: v } })} multiline />
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
      <SectionHead id="sheet" label={t('vision.section.sheet')} title={t('sheet.title')} />
      <p className="muted small">{t('sheet.help')}</p>
      {VISION_SECTIONS.map((s, i) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`vs-${s}`}><span className="chip small" style={{ marginRight: 6 }}>{t('home.module')} {i < 4 ? 6 : 7}</span> <strong>{i + 1}. {t(`sheet.${s}`)}</strong> — {t(`sheet.${s}.q`)}</label>
            <AutoText id={`vs-${s}`} placeholder={t(`sheet.${s}.placeholder`)} value={v.worksheet[s] ?? ''} onSave={(v) => save({ worksheet: { [s]: v } })} multiline />
          </div>
        </div>
      ))}
      {(v.worksheet.statement ?? '').trim() && (
        <div className="card soft">
          <div className="small muted">{t('sheet.check')}</div>
          <ul className="small" style={{ margin: '4px 0 0', paddingLeft: '1.3rem' }}>{['mine', 'stretch', 'decide'].map((k) => <li key={k}>{t(`sheet.check.${k}`)}</li>)}</ul>
        </div>
      )}
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/sheet">{t('sheet.print')}</Link></p>

      {/* regret and yes/no */}
      <SectionHead id="regret" label={t('vision.section.regret')} title={t('regret.title')} />
      <p className="muted small">{t('regret.help')}</p>
      {REGRET_AREAS.map((a: RegretArea) => (
        <div className="card" key={a}>
          <div className="field">
            <label htmlFor={`regret-${a}`}><strong>{t(`regret.${a}`)}</strong> — {t('regret.q')}</label>
            <AutoText id={`regret-${a}`} placeholder={t(`regret.${a}.placeholder`)} style={{ minHeight: 72 }} value={v.regret?.[a] ?? ''} onSave={(v) => save({ regret: { [a]: v } })} multiline />
          </div>
        </div>
      ))}
      <h3>{t('yesno.title')}</h3>
      <p className="muted small">{t('yesno.help')}</p>
      <div className="card">
        {(['yes', 'no', 'changes', 'hardest'] as const).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`yn-${k}`}><strong>{t(`yesno.${k}`)}</strong></label>
            <AutoText id={`yn-${k}`} placeholder={t(`yesno.${k}.placeholder`)} style={{ minHeight: 72 }} value={v.yesno?.[k] ?? ''} onSave={(v) => save({ yesno: { [k]: v } })} multiline />
          </div>
        ))}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/regret">{t('regret.print')}</Link></p>

      {/* check-in */}
      <SectionHead id="checkin" label={t('vision.section.checkin')} title={t('checkin.title')} />
      <p className="muted small">{t('checkin.help')}</p>
      <div className={`card ${due ? 'soft' : ''}`}>
        <div className="field">
          <label>{t('checkin.every')}</label>
          <div className="row">
            {([3, 6] as const).map((m) => <button key={m} className={`chip ${every === m && C.next ? 'on' : ''}`} onClick={() => setEvery(m)}>{t(`checkin.every.${m}`)}</button>)}
          </div>
        </div>
        {C.next ? (
          <>
            <p style={{ margin: 0 }}><strong>{due ? t('checkin.due') : t('checkin.next', { date: fmtDate(C.next) })}</strong></p>
            <button className="btn" onClick={() => download('verificarea-viziunii.ics', dateIcs(C.next!, 'checkin', t('checkin.ics.title'), t('checkin.ics.body')))}>{t('letter.ics')}</button>
            <p className="small muted" style={{ margin: 0 }}>{t('letter.ics.help')}</p>
          </>
        ) : <p className="small muted" style={{ margin: 0 }}>{t('checkin.none')}</p>}
      </div>
      <h3>{t('checkin.steps')}</h3>
      <div className="card">
        <ol style={{ margin: 0, paddingLeft: '1.3rem' }}>{CHECKIN_STEPS.map((s) => <li key={s}>{t(`checkin.step.${s}`)}</li>)}</ol>
        <div className="field">
          <label htmlFor="checkin-note">{t('checkin.note')}</label>
          <textarea id="checkin-note" placeholder={t('checkin.note.placeholder')} value={checkNote} onChange={(e) => setCheckNote(e.target.value)} style={{ minHeight: 72 }} />
        </div>
        <button className="btn primary" onClick={doneCheckin} disabled={!C.next}>{t('checkin.done')}</button>
        {(C.log ?? []).length > 0 && <ul className="list small">{[...(C.log ?? [])].reverse().map((l, i) => <li key={i}><span className="muted">{fmtDate(l.date)}</span> — {l.note || t('checkin.noNote')}</li>)}</ul>}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/checkin">{t('checkin.print')}</Link></p>

      {/* retrospective */}
      <SectionHead id="retro" label={t('vision.section.retro')} title={t('retro.title')} />
      <p className="muted small">{t('retro.help')}</p>
      <div className="card">
        <div className="small muted">{t('retro.words')}</div>
        {notes.filter((n) => n.oneWord).length === 0 ? <p className="small muted" style={{ margin: 0 }}>{t('retro.words.none')}</p> : (
          <ul className="list small">{notes.filter((n) => n.oneWord).map((n) => <li key={n.moduleId}>{t('home.module')} {Number(n.moduleId)}: <strong>{n.oneWord}</strong>{n.takeaways ? <span className="muted"> — {n.takeaways}</span> : null}</li>)}</ul>
        )}
      </div>
      <div className="card">
        {(['tool', 'habit', 'aha', 'word'] as const).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`retro-${k}`}><strong>{t(`retro.${k}`)}</strong></label>
            {k === 'word'
              ? <AutoText id={`retro-${k}`} maxLength={40} placeholder={t(`retro.${k}.placeholder`)} value={v.retro?.[k] ?? ''} onSave={(v) => save({ retro: { [k]: v } })} />
              : <AutoText id={`retro-${k}`} placeholder={t(`retro.${k}.placeholder`)} style={{ minHeight: 72 }} value={v.retro?.[k] ?? ''} onSave={(v) => save({ retro: { [k]: v } })} multiline />}
          </div>
        ))}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/retro">{t('retro.print')}</Link></p>
    </>
  )
}
