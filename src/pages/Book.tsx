import { Link, useParams } from 'react-router-dom'
import { useT } from '../i18n'
import { SHEETS, sheetById } from '../sheets/registry'

/** The Dream Book: the list of printable sheets, and the print view of one or all of them (FR-04). */
export default function Book({ print = false }: { print?: boolean }) {
  const { t } = useT()
  const { which = 'all' } = useParams()
  const defs = which === 'all' ? SHEETS : [sheetById(which)].filter((x): x is NonNullable<typeof x> => !!x)

  if (!print) {
    return (
      <>
        <h1>{t('book.title')}</h1>
        <p className="muted">{t('book.intro')}</p>
        <p>
          <Link className="btn primary" to="/book/print/all">
            {t('book.printAll')}
          </Link>
        </p>
        <ul className="list">
          {SHEETS.map((s, i) => (
            <li key={s.id} className="row" style={{ justifyContent: 'space-between' }}>
              <span>
                {i + 1}. {t(`book.sheet.${s.id}`)}
              </span>
              <Link className="btn sm" to={`/book/print/${s.id}`}>
                {t('book.preview')}
              </Link>
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <>
      <p className="row no-print">
        <Link className="btn" to="/book">
          {t('common.back')}
        </Link>
        <button className="btn primary" onClick={() => window.print()}>
          {t('common.print')}
        </button>
      </p>
      <div className="sheet-preview">
        {defs.map((s) => (
          <s.Component key={s.id} />
        ))}
      </div>
    </>
  )
}
