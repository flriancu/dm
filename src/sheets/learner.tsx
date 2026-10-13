/** Printable sheets: each `.sheet` section prints on its own A4 page. */
import { useT, contentLocaleFor } from '../i18n'
import { useSettings } from '../state/settings'
import { CLARIFY_STEPS, ROUTE_SLOTS, WOOP_STEPS, QUADRANTS } from '../db/db'
import { useDreams } from '../db/dreams'
import { usePrintedDream } from './usePrintedDream'
import { useWeekTasks } from '../db/week'
import { loadDoc } from '../content/loader'
import { useContent } from '../content/useContent'

export function CoverSheet() {
  const { locale } = useT()
  const lang = contentLocaleFor(locale)
  const doc = useContent(`cover:${lang}`, () => loadDoc(lang, 'sheets', 'coperta'))
  return (
    <section className="sheet">
      <h1>{String(doc?.meta.title ?? '')}</h1>
      <p>
        ______________________________ &nbsp; <small>{new Date().getFullYear()}</small>
      </p>
      <div dangerouslySetInnerHTML={{ __html: doc?.html ?? '' }} />
    </section>
  )
}

/** Fifty dreams per page, at least the hundred lines of the paper book, more pages for a longer list. */
const DREAMS_PER_PAGE = 50
export function DreamsSheet() {
  const { t, fmtDate } = useT()
  const dreams = useDreams() ?? []
  const pages = Math.max(2, Math.ceil(dreams.length / DREAMS_PER_PAGE))
  const rows = Array.from({ length: pages * DREAMS_PER_PAGE }, (_, i) => dreams[i])
  const parts = Array.from({ length: pages }, (_, p) => rows.slice(p * DREAMS_PER_PAGE, (p + 1) * DREAMS_PER_PAGE))
  return (
    <>
      {parts.map((part, p) => (
        <section className="sheet" key={p}>
          <h1>
            {t('book.sheet.dreams')} {p * DREAMS_PER_PAGE + 1}–{(p + 1) * DREAMS_PER_PAGE}
          </h1>
          <table>
            <thead>
              <tr>
                <th style={{ width: '2.5em' }}>{t('book.col.n')}</th>
                <th>{t('book.col.dream')}</th>
                <th style={{ width: '7em' }}>{t('book.col.added')}</th>
                <th style={{ width: '7em' }}>{t('book.col.achieved')}</th>
                <th style={{ width: '6em' }}>{t('book.col.area')}</th>
              </tr>
            </thead>
            <tbody>
              {part.map((d, i) => (
                <tr key={i}>
                  <td>{p * DREAMS_PER_PAGE + i + 1}</td>
                  <td>
                    {d?.text ?? ''}
                    {d?.dateReleased ? <em> ({t('dreams.released', { date: fmtDate(d.dateReleased) })})</em> : null}
                  </td>
                  <td>{d?.dateAdded ?? ''}</td>
                  <td>{d?.dateAchieved ?? ''}</td>
                  <td>{d?.area ? t(`area.${d.area}`) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </>
  )
}

export function RatingSheet() {
  const { t } = useT()
  const { settings } = useSettings()
  const dreams = useDreams() ?? []
  const criteria = [t('dreams.criteria.fixed'), ...settings.criteria]
  while (criteria.length < 4) criteria.push('')
  const rows = Array.from({ length: Math.max(30, dreams.length) }, (_, i) => dreams[i])
  return (
    <section className="sheet">
      <h1>{t('book.sheet.rating')}</h1>
      <p>{t('dreams.criteria')}:</p>
      <ol>
        {criteria.map((c, i) => (
          <li key={i}>
            {c || ' '}
            <div className="lines" />
          </li>
        ))}
      </ol>
      <p>{t('dreams.criteria.help')}</p>
      <table>
        <thead>
          <tr>
            <th style={{ width: '2.5em' }}>{t('book.col.n')}</th>
            <th>{t('book.col.dream')}</th>
            <th style={{ width: '6em' }}>{t('book.col.dreamScore')}</th>
            <th style={{ width: '9em' }}>{t('book.col.why')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{d?.text ?? ''}</td>
              <td>{d?.score ?? ''}</td>
              <td>{d?.why ? t(`dreams.tag.${d.why}`) : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function ClarifySheet() {
  const { t } = useT()
  const { dream, work } = usePrintedDream()
  const routes = Array.from({ length: ROUTE_SLOTS }, (_, i) => work?.routes?.[i] ?? '')
  return (
    <section className="sheet">
      <h1>{t('book.sheet.clarify')}</h1>
      <p>
        {t('home.chosen')}: <strong>{dream?.text ?? ''}</strong>
      </p>
      {!dream && <div className="lines" />}
      <table>
        <thead>
          <tr>
            <th style={{ width: '6em' }}>{t('book.col.step')}</th>
            <th style={{ width: '38%' }}>{t('book.col.question')}</th>
            <th>{t('book.col.answer')}</th>
          </tr>
        </thead>
        <tbody>
          {CLARIFY_STEPS.map((s) => (
            <tr key={s}>
              <td>{t(`clarify.${s}`)}</td>
              <td>{t(`clarify.${s}.q`)}</td>
              <td>
                {work?.clarify?.[s] ?? ''}
                <div style={{ minHeight: '22mm' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>{t('mydream.routes')}</h3>
      {routes.map((r, i) => (
        <div key={i}>
          <p style={{ margin: '6px 0 0' }}>
            {t('mydream.route', { n: i + 1 })}: {r}
          </p>
          <div className="lines" />
        </div>
      ))}
    </section>
  )
}

export function WeekSheet() {
  const { t } = useT()
  const tasks = useWeekTasks() ?? []
  const cell = (q: (typeof QUADRANTS)[number]) =>
    tasks
      .filter((x) => x.quadrant === q)
      .map((x) => x.text)
      .join(' · ')
  return (
    <section className="sheet">
      <h1>{t('book.sheet.week')}</h1>
      <p>{t('week.intro')}</p>
      <table>
        <thead>
          <tr>
            <th style={{ width: '18%' }} />
            <th>{t('week.axis.urgent')}</th>
            <th>{t('week.axis.notUrgent')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>{t('week.axis.important')}</th>
            <td>
              <strong>{t('week.quadrant.now')}</strong>
              <div style={{ minHeight: '40mm' }}>{cell('now')}</div>
            </td>
            <td>
              <strong>{t('week.quadrant.plan')}</strong>
              <div style={{ minHeight: '40mm' }}>{cell('plan')}</div>
            </td>
          </tr>
          <tr>
            <th>{t('week.axis.notImportant')}</th>
            <td>
              <strong>{t('week.quadrant.delegate')}</strong>
              <div style={{ minHeight: '40mm' }}>{cell('delegate')}</div>
            </td>
            <td>
              <strong>{t('week.quadrant.drop')}</strong>
              <div style={{ minHeight: '40mm' }}>{cell('drop')}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <h3>{t('week.reflect')}</h3>
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <p style={{ margin: '6px 0 0' }}>{t(`week.reflect.${i}`)}</p>
          <div className="lines" />
        </div>
      ))}
    </section>
  )
}

export function WoopSheet() {
  const { t } = useT()
  const { dream, work } = usePrintedDream()
  return (
    <section className="sheet">
      <h1>{t('book.sheet.woop')}</h1>
      <p>
        {t('home.chosen')}: <strong>{dream?.text ?? ''}</strong>
      </p>
      <p>{t('woop.help')}</p>
      <table>
        <thead>
          <tr>
            <th style={{ width: '7em' }}>{t('book.col.step')}</th>
            <th style={{ width: '38%' }}>{t('book.col.what')}</th>
            <th>{t('book.col.answer')}</th>
          </tr>
        </thead>
        <tbody>
          {WOOP_STEPS.map((s) => (
            <tr key={s}>
              <td>{t(`woop.${s}`)}</td>
              <td>{t(`woop.${s}.q`)}</td>
              <td>
                {work?.woop?.[s] ?? ''}
                <div style={{ minHeight: '26mm' }} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
