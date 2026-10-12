import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings } from '../state/settings'
import { db } from '../db/db'
import { loadDoc } from '../content/loader'

/** Dream Book sheets available so far (FR-04). Each sheet is a `.sheet` block that prints on its own page. */
const SHEETS = ['cover', 'dreams', 'rating'] as const
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
