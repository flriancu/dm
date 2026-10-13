/** Printable sheets: each `.sheet` section prints on its own A4 page. */
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import { db, VISION_SECTIONS, REGRET_AREAS } from '../db/db'

export function ValuesSheet() {
  const { t } = useT()
  const v = useLiveQuery(() => db.vision.get('me'), [])
  const vals: { text: string; chosen?: boolean; nonNegotiable?: boolean }[] = [...(v?.values ?? []), ...Array.from({ length: 10 }, () => ({ text: '' }))].slice(0, 10)
  return (
    <section className="sheet">
      <h1>{t('book.sheet.values')}</h1>
      <p>{t('values.help')}</p>
      <table><thead><tr><th style={{ width: '3em' }}>{t('book.col.n')}</th><th>{t('values.title')}</th><th style={{ width: '5em' }}>★</th><th style={{ width: '8em' }}>{t('values.nonneg.short')}</th></tr></thead>
        <tbody>{vals.map((x, i) => <tr key={i}><td>{i + 1}</td><td>{x.text}</td><td>{x.chosen ? '★' : ''}</td><td>{x.nonNegotiable ? '✓' : ''}</td></tr>)}</tbody></table>
      <h3>{t('values.acts')}</h3>
      {[1, 2, 3].map((i) => <div key={i} className="lines" />)}
    </section>
  )
}

export function LetterSheet() {
  const { t } = useT()
  const v = useLiveQuery(() => db.vision.get('me'), [])
  const qs = ['where', 'doing', 'feel', 'built', 'stopped', 'mattered', 'advice']
  const hidden = !!v?.letter?.sealed && !v?.letter?.opened
  return (
    <>
      <section className="sheet">
        <h1>{t('book.sheet.letter')}</h1>
        <p>{t('letter.help')}</p>
        <ol>{qs.map((q) => <li key={q}>{t(`letter.q.${q}`)}</li>)}</ol>
        <div className="box" style={{ minHeight: '120mm', whiteSpace: 'pre-wrap' }}>{hidden ? '' : (v?.letter?.text ?? '')}</div>
      </section>
      <section className="sheet">
        <h1>{t('letter.reply')}</h1>
        <div className="box" style={{ minHeight: '90mm', whiteSpace: 'pre-wrap' }}>{hidden ? '' : (v?.letter?.reply ?? '')}</div>
        <p>{t('letter.date')}: {v?.letter?.deliverDate ?? '____________'}</p>
      </section>
    </>
  )
}

export function VisionSheet() {
  const { t } = useT()
  const v = useLiveQuery(() => db.vision.get('me'), [])
  const pages = [VISION_SECTIONS.slice(0, 4), VISION_SECTIONS.slice(4, 7), VISION_SECTIONS.slice(7)]
  return (
    <>
      {pages.map((secs, p) => (
        <section className="sheet" key={p}>
          <h1>{t('book.sheet.sheet')} {p + 1}/3</h1>
          {secs.map((sec) => {
            const i = VISION_SECTIONS.indexOf(sec)
            return <div key={sec}><h3>{i + 1}. {t(`sheet.${sec}`)}</h3><p>{t(`sheet.${sec}.q`)}</p><div className="box" style={{ minHeight: '34mm', whiteSpace: 'pre-wrap' }}>{v?.worksheet?.[sec] ?? ''}</div></div>
          })}
        </section>
      ))}
    </>
  )
}

export function RegretSheet() {
  const { t } = useT()
  const v = useLiveQuery(() => db.vision.get('me'), [])
  return (
    <section className="sheet">
      <h1>{t('book.sheet.regret')}</h1>
      <p>{t('regret.help')}</p>
      {REGRET_AREAS.map((a) => <div key={a}><h3>{t(`regret.${a}`)}</h3><div className="box" style={{ minHeight: '22mm' }}>{v?.regret?.[a] ?? ''}</div></div>)}
      <h3>{t('yesno.title')}</h3>
      {(['yes', 'no', 'changes', 'hardest'] as const).map((k) => <div key={k}><p style={{ margin: '4px 0 0' }}><strong>{t(`yesno.${k}`)}</strong></p><div className="box" style={{ minHeight: '18mm' }}>{v?.yesno?.[k] ?? ''}</div></div>)}
    </section>
  )
}

export function CheckinSheet() {
  const { t, fmtDate } = useT()
  const v = useLiveQuery(() => db.vision.get('me'), [])
  const log = v?.checkin?.log ?? []
  return (
    <section className="sheet">
      <h1>{t('book.sheet.checkin')}</h1>
      <p>{t('checkin.help')}</p>
      <h3>{t('checkin.steps')}</h3>
      <ol>{['vision', 'wheel', 'dreams', 'directions', 'yesno', 'letgo'].map((k) => <li key={k}>{t(`checkin.step.${k}`)}</li>)}</ol>
      <table><thead><tr><th style={{ width: '10em' }}>{t('book.col.date')}</th><th>{t('checkin.note')}</th></tr></thead>
        <tbody>{[...log, ...Array.from({ length: Math.max(0, 8 - log.length) }, () => null)].map((l, i) => <tr key={i}><td>{l ? fmtDate(l.date) : ''}</td><td>{l?.note ?? ''}<div style={{ minHeight: '10mm' }} /></td></tr>)}</tbody></table>
    </section>
  )
}

export function RetroSheet() {
  const { t } = useT()
  const v = useLiveQuery(() => db.vision.get('me'), [])
  const notes = useLiveQuery(() => db.moduleNotes.orderBy('moduleId').toArray(), []) ?? []
  return (
    <section className="sheet">
      <h1>{t('book.sheet.retro')}</h1>
      <h3>{t('retro.words')}</h3>
      <table><tbody>{[0, 1, 2, 3, 4, 5, 6, 7].map((m) => { const n = notes.find((x) => Number(x.moduleId) === m); return <tr key={m}><th style={{ width: '8em' }}>{t('home.module')} {m}</th><td>{n?.oneWord ?? ''}</td></tr> })}</tbody></table>
      {(['tool', 'habit', 'aha', 'word'] as const).map((k) => <div key={k}><h3>{t(`retro.${k}`)}</h3><div className="box" style={{ minHeight: k === 'word' ? '10mm' : '20mm' }}>{v?.retro?.[k] ?? ''}</div></div>)}
    </section>
  )
}
