import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings, showsDreamerParts, showsFriendSwitch } from '../state/settings'
import { db } from '../db/db'
import { listModules, type ModuleMeta } from '../content/loader'
import { addDays, parseLocal, today } from '../lib/dates'

export function moduleDate(start: string | undefined, cadence: number, order: number): Date | null {
  if (!start) return null
  return parseLocal(addDays(start, cadence * Math.max(0, order - 1)))   // module 0 is solo, module 1 is meeting one
}

export default function Home() {
  const { t, fmtDate, locale } = useT()
  const { settings, update } = useSettings()
  const [modules, setModules] = useState<ModuleMeta[]>([])
  useEffect(() => { listModules(contentLocaleFor(locale)).then(setModules) }, [locale])

  const notes = useLiveQuery(() => db.moduleNotes.toArray(), []) ?? []
  const plans = useLiveQuery(() => db.plans.filter((p) => !p.done).toArray(), []) ?? []
  const chosen = useLiveQuery(() => db.dreams.where('chosen').equals(1).first(), [])
  const vision = useLiveQuery(() => db.vision.get('me'), [])
  const checkinDue = !!vision?.checkin?.next && vision.checkin.next <= today()
  const done = new Set(notes.filter((n) => n.completedOn).map((n) => n.moduleId))
  const next = modules.find((m) => m.order > 0 && !done.has(m.id))
  const nextDate = next ? moduleDate(settings.startDate, settings.cadenceDays, next.order) : null

  return (
    <>
      <div className="card soft">
        <div className="small muted">{t('home.next')}</div>
        {next ? (
          <>
            <div style={{ fontSize: '1.2rem', fontWeight: 650 }}>{t('home.module')} {next.order}: {next.title}</div>
            <div>{nextDate ? fmtDate(nextDate) : t('home.next.none')}</div>
            <Link className="btn sm" to={`/module/${next.id}`}>{t('common.continue')}</Link>
          </>
        ) : modules.length === 0 ? <div className="muted">…</div> : <div>{t('home.next.allDone')}</div>}
      </div>

      {checkinDue && (
        <div className="card soft">
          <strong>{t('home.checkin.due')}</strong>
          <div><Link className="btn sm" to="/vision#checkin">{t('home.checkin.open')}</Link></div>
        </div>
      )}

      {showsFriendSwitch(settings) && (
        <label className="card row" style={{ cursor: 'pointer' }}>
          <input type="checkbox" checked={settings.friendToday} onChange={(e) => update({ friendToday: e.target.checked })} />
          <span>{t('home.friendMode')}<br /><span className="small muted">{t('home.friendMode.help')}</span></span>
        </label>
      )}

      {showsDreamerParts(settings) && (
        <>
          <h2>{t('home.chosen')}</h2>
          <div className="card">
            {chosen ? <><strong>{chosen.text}</strong><div><Link className="btn sm" to="/dream">{t('home.chosen.open')}</Link></div></> : <span className="muted">{t('home.chosen.none')}</span>}
          </div>

          <h2>{t('home.plans')}</h2>
          <div className="card">
            {plans.length === 0 ? <span className="muted">{t('home.plans.none')}</span> : (
              <ul className="list">
                {plans.map((p) => (
                  <li key={p.id} className="row">
                    <input type="checkbox" aria-label={t('home.plans.done')} title={t('home.plans.done')} onChange={() => db.plans.update(p.id!, { done: 1 })} />
                    <span><em>{t('plan.if')}</em> {p.condition}, <em>{t('plan.then')}</em> {p.action}
                      <span className="small muted"> · {t('home.module')} {Number(p.moduleId)}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <h2>{t('home.work')}</h2>
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>{t('home.work.help')}</p>
        <div className="row">
          <Link className="btn sm" to="/dream">{t('mydream.title')}</Link>
          <Link className="btn sm" to="/week">{t('week.title')}</Link>
          <Link className="btn sm" to="/calm">{t('calm.title')}</Link>
          <Link className="btn sm" to="/vision">{t('vision.title')}</Link>
        </div>
      </div>

      <h2>{t('modules.title')}</h2>
      <div className="progress" aria-hidden>
        {modules.filter((m) => m.order > 0).map((m) => <span key={m.id} className={done.has(m.id) ? 'on' : ''} />)}
      </div>
      <ul className="list">
        {modules.map((m) => {
          const d = moduleDate(settings.startDate, settings.cadenceDays, m.order)
          return (
            <li key={m.id}>
              <Link to={`/module/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>{m.order}. {m.title}</strong> {done.has(m.id) && '✓'}
                <div className="small muted">{m.subtitle}{m.order > 0 && d ? ` · ${fmtDate(d)}` : ''}</div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
