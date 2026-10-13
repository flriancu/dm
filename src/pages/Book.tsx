import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings } from '../state/settings'
import { db, CLARIFY_STEPS, WOOP_STEPS, QUADRANTS, HABIT_PARTS } from '../db/db'
import { loadDoc } from '../content/loader'

/** Dream Book sheets available so far (FR-04). Each sheet is a `.sheet` block that prints on its own page. */
const SHEETS = ['cover', 'dreams', 'rating', 'clarify', 'week', 'woop', 'habit', 'friends', 'fear'] as const
type SheetId = (typeof SHEETS)[number]

export default function Book({ print = false }: { print?: boolean }) {
  const { t } = useT()
  const { which = 'all' } = useParams()
  const ids: SheetId[] = print ? (which === 'all' ? [...SHEETS] : (SHEETS as readonly string[]).includes(which) ? [which as SheetId] : []) : []

  if (!print) {
    return (
      <>
        <h1>{t('book.title')}</h1>
        <p className="muted">{t('book.intro')}</p>
        <p><Link className="btn primary" to="/book/print/all">{t('book.printAll')}</Link></p>
        <ul className="list">
          {SHEETS.map((s, i) => (
            <li key={s} className="row" style={{ justifyContent: 'space-between' }}>
              <span>{i + 1}. {t(`book.sheet.${s}`)}</span>
              <Link className="btn sm" to={`/book/print/${s}`}>{t('book.preview')}</Link>
            </li>
          ))}
        </ul>
        <p className="small muted">{t('book.sheet.soon')}</p>
      </>
    )
  }

  return (
    <>
      <p className="row no-print">
        <Link className="btn" to="/book">{t('common.back')}</Link>
        <button className="btn primary" onClick={() => window.print()}>{t('common.print')}</button>
      </p>
      <div className="sheet-preview">
        {ids.includes('cover') && <CoverSheet />}
        {ids.includes('dreams') && <DreamsSheet />}
        {ids.includes('rating') && <RatingSheet />}
        {ids.includes('clarify') && <ClarifySheet />}
        {ids.includes('week') && <WeekSheet />}
        {ids.includes('woop') && <WoopSheet />}
        {ids.includes('habit') && <HabitSheet />}
        {ids.includes('friends') && <FriendsSheet />}
        {ids.includes('fear') && <FearSheet />}
      </div>
    </>
  )
}

function CoverSheet() {
  const { locale } = useT()
  const [doc, setDoc] = useState<{ meta: Record<string, unknown>; html: string } | null>(null)
  useEffect(() => { loadDoc(contentLocaleFor(locale), 'sheets', 'coperta').then(setDoc) }, [locale])
  return (
    <section className="sheet">
      <h1>{String(doc?.meta.title ?? '')}</h1>
      <p>______________________________ &nbsp; <small>{new Date().getFullYear()}</small></p>
      <div dangerouslySetInnerHTML={{ __html: doc?.html ?? '' }} />
    </section>
  )
}

function DreamsSheet() {
  const { t } = useT()
  const dreams = useLiveQuery(() => db.dreams.toArray(), []) ?? []
  const rows = Array.from({ length: 100 }, (_, i) => dreams[i])
  const half = [rows.slice(0, 50), rows.slice(50)]
  return (
    <>
      {half.map((part, p) => (
        <section className="sheet" key={p}>
          <h1>{t('book.sheet.dreams')} {p === 0 ? '1–50' : '51–100'}</h1>
          <table>
            <thead><tr><th style={{ width: '2.5em' }}>{t('book.col.n')}</th><th>{t('book.col.dream')}</th><th style={{ width: '7em' }}>{t('book.col.added')}</th><th style={{ width: '7em' }}>{t('book.col.achieved')}</th><th style={{ width: '6em' }}>{t('book.col.area')}</th></tr></thead>
            <tbody>
              {part.map((d, i) => (
                <tr key={i}><td>{p * 50 + i + 1}</td><td>{d?.text ?? ''}</td><td>{d?.dateAdded ?? ''}</td><td>{d?.dateAchieved ?? ''}</td><td>{d?.area ? t(`area.${d.area}`) : ''}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  )
}

function RatingSheet() {
  const { t } = useT()
  const { settings } = useSettings()
  const criteria = [t('dreams.criteria.fixed'), ...settings.criteria]
  while (criteria.length < 4) criteria.push('')
  return (
    <section className="sheet">
      <h1>{t('book.sheet.rating')}</h1>
      <p>{t('dreams.criteria')}:</p>
      <ol>{criteria.map((c, i) => <li key={i}>{c || ' '}<div className="lines" /></li>)}</ol>
      <table>
        <thead><tr><th>{t('book.col.n')}</th>{criteria.map((_, i) => <th key={i}>{i + 1}</th>)}<th>{t('book.col.score')}</th><th>{t('book.col.why')}</th></tr></thead>
        <tbody>
          {Array.from({ length: 25 }, (_, i) => (
            <tr key={i}><td>&nbsp;</td>{criteria.map((_, j) => <td key={j} />)}<td /><td /></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function ClarifySheet() {
  const { t } = useT()
  const dream = useLiveQuery(() => db.dreams.where('chosen').equals(1).first(), [])
  const work = useLiveQuery(() => (dream?.id ? db.dreamWork.get(dream.id) : undefined), [dream?.id])
  const routes = [...(work?.routes ?? []), '', '', ''].slice(0, 3)
  return (
    <section className="sheet">
      <h1>{t('book.sheet.clarify')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      {!dream && <div className="lines" />}
      <table>
        <thead><tr><th style={{ width: '6em' }}>{t('book.col.step')}</th><th style={{ width: '38%' }}>{t('book.col.question')}</th><th>{t('book.col.answer')}</th></tr></thead>
        <tbody>
          {CLARIFY_STEPS.map((s) => (
            <tr key={s}><td>{t(`clarify.${s}`)}</td><td>{t(`clarify.${s}.q`)}</td><td>{work?.clarify?.[s] ?? ''}<div style={{ minHeight: '22mm' }} /></td></tr>
          ))}
        </tbody>
      </table>
      <h3>{t('mydream.routes')}</h3>
      {routes.map((r, i) => <div key={i}><p style={{ margin: '6px 0 0' }}>{t('mydream.route', { n: i + 1 })}: {r}</p><div className="lines" /></div>)}
    </section>
  )
}

function WeekSheet() {
  const { t } = useT()
  const tasks = useLiveQuery(() => db.weekTasks.toArray(), []) ?? []
  const cell = (q: (typeof QUADRANTS)[number]) => tasks.filter((x) => x.quadrant === q).map((x) => x.text).join(' · ')
  return (
    <section className="sheet">
      <h1>{t('book.sheet.week')}</h1>
      <p>{t('week.intro')}</p>
      <table>
        <thead><tr><th style={{ width: '18%' }} /><th>{t('week.axis.urgent')}</th><th>{t('week.axis.notUrgent')}</th></tr></thead>
        <tbody>
          <tr><th>{t('week.axis.important')}</th><td><strong>{t('week.quadrant.now')}</strong><div style={{ minHeight: '40mm' }}>{cell('now')}</div></td><td><strong>{t('week.quadrant.plan')}</strong><div style={{ minHeight: '40mm' }}>{cell('plan')}</div></td></tr>
          <tr><th>{t('week.axis.notImportant')}</th><td><strong>{t('week.quadrant.delegate')}</strong><div style={{ minHeight: '40mm' }}>{cell('delegate')}</div></td><td><strong>{t('week.quadrant.drop')}</strong><div style={{ minHeight: '40mm' }}>{cell('drop')}</div></td></tr>
        </tbody>
      </table>
      <h3>{t('week.reflect')}</h3>
      {[1, 2, 3, 4].map((i) => <div key={i}><p style={{ margin: '6px 0 0' }}>{t(`week.reflect.${i}`)}</p><div className="lines" /></div>)}
    </section>
  )
}

function WoopSheet() {
  const { t } = useT()
  const dream = useLiveQuery(() => db.dreams.where('chosen').equals(1).first(), [])
  const work = useLiveQuery(() => (dream?.id ? db.dreamWork.get(dream.id) : undefined), [dream?.id])
  return (
    <section className="sheet">
      <h1>{t('book.sheet.woop')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <p>{t('woop.help')}</p>
      <table>
        <thead><tr><th style={{ width: '7em' }}>{t('book.col.step')}</th><th style={{ width: '38%' }}>{t('book.col.what')}</th><th>{t('book.col.answer')}</th></tr></thead>
        <tbody>
          {WOOP_STEPS.map((s) => (
            <tr key={s}><td>{t(`woop.${s}`)}</td><td>{t(`woop.${s}.q`)}</td><td>{work?.woop?.[s] ?? ''}<div style={{ minHeight: '26mm' }} /></td></tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function useWork() {
  const dream = useLiveQuery(() => db.dreams.where('chosen').equals(1).first(), [])
  const work = useLiveQuery(() => (dream?.id ? db.dreamWork.get(dream.id) : undefined), [dream?.id])
  return { dream, work }
}

function HabitSheet() {
  const { t, fmtDate } = useT()
  const { dream, work } = useWork()
  const log = [...(work?.habitLog ?? [])].sort((a, b) => a.week.localeCompare(b.week))
  const rows = [...log, ...Array.from({ length: Math.max(0, 16 - log.length) }, () => null)]
  return (
    <section className="sheet">
      <h1>{t('book.sheet.habit')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <table>
        <thead><tr>{HABIT_PARTS.map((h) => <th key={h}>{t(`habit.${h}`)}</th>)}</tr></thead>
        <tbody><tr>{HABIT_PARTS.map((h) => <td key={h}>{work?.habit?.[h] ?? ''}<div style={{ minHeight: '18mm' }} /></td>)}</tr></tbody>
      </table>
      <h3>{t('habit.log')}</h3>
      <table>
        <thead><tr><th style={{ width: '9em' }}>{t('book.col.week')}</th><th style={{ width: '6em' }}>{t('book.col.done')}</th><th>{t('book.col.sent')}</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{r ? fmtDate(r.week) : ''}</td><td>{r?.done ? '✓' : ''}</td><td>{r?.note ?? ''}</td></tr>)}</tbody>
      </table>
    </section>
  )
}

function FriendsSheet() {
  const { t } = useT()
  const { dream, work } = useWork()
  const friends = [...(work?.friends ?? []), {}, {}, {}].slice(0, 3)
  return (
    <section className="sheet">
      <h1>{t('book.sheet.friends')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <table>
        <thead><tr><th style={{ width: '30%' }}>{t('book.col.person')}</th><th>{t('book.col.role')}</th></tr></thead>
        <tbody>{friends.map((f, i) => <tr key={i}><td>{f.name ?? ''}<div style={{ minHeight: '10mm' }} /></td><td>{f.role ? t(`friends.role.${f.role}`) : ''}{f.day ? ` · ${f.day}` : ''}</td></tr>)}</tbody>
      </table>
      <h3>{t('friends.ask')}</h3>
      <div className="box">{friends.find((f) => f.role === 'ask')?.ask ?? ''}</div>
    </section>
  )
}

function FearSheet() {
  const { t } = useT()
  const { dream, work } = useWork()
  return (
    <section className="sheet">
      <h1>{t('book.sheet.fear')}</h1>
      <p>{t('home.chosen')}: <strong>{dream?.text ?? ''}</strong></p>
      <h3>{t('fear.fear')}</h3><p>{t('fear.fear.q')}</p>
      <div className="box">{work?.fear?.fear ?? ''}</div>
      <h3>{t('fear.goodEnough')}</h3><p>{t('fear.goodEnough.q')}</p>
      <div className="box">{work?.fear?.goodEnough ?? ''}</div>
    </section>
  )
}
