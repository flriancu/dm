import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings } from '../state/settings'
import { showsDreamerParts, showsFriendSwitch, showsFriendSection } from '../state/roles'
import { useModuleNotes, completedModuleIds, useOpenPlans, hidePlan } from '../db/notes'
import { useVision } from '../db/vision'
import { useChosenDream } from '../db/hooks'
import { listModules, type ModuleMeta } from '../content/loader'
import { today } from '../lib/dates'
import { moduleDate, nextModule, letterDue } from '../lib/course'

export default function Home() {
  const { t, fmtDate, locale } = useT()
  const { settings, update } = useSettings()
  const [modules, setModules] = useState<ModuleMeta[]>([])
  useEffect(() => {
    listModules(contentLocaleFor(locale)).then(setModules)
  }, [locale])

  const notes = useModuleNotes() ?? []
  const vision = useVision()
  const checkinDue = !!vision?.checkin?.next && vision.checkin.next <= today()
  const done = completedModuleIds(notes)
  const next = nextModule(modules, done)
  const nextDate = next ? moduleDate(settings.startDate, settings.cadenceDays, next.order) : null
  const dreamer = showsDreamerParts(settings)
  const friend = showsFriendSection(settings)
  const pair = showsFriendSwitch(settings)

  return (
    <>
      <div className="card soft">
        {next && next.order === 0 ? (
          <>
            <div className="small muted">{t('home.first')}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 650 }}>
              {t('home.module')} 0: {next.title}
            </div>
            <div className="small muted">{t('home.first.help')}</div>
            <Link className="btn sm" to={`/module/${next.id}`}>
              {t('common.continue')}
            </Link>
          </>
        ) : next ? (
          <>
            <div className="small muted">{t('home.next')}</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 650 }}>
              {t('home.module')} {next.order}: {next.title}
            </div>
            <div>{nextDate ? fmtDate(nextDate) : t('home.next.none')}</div>
            {pair && <div className="small">{settings.friendToday ? t('home.lead.me') : t('home.lead.other')}</div>}
            <div className="row">
              {friend && (
                <Link className="btn sm" to={`/friend/${next.id}`}>
                  {t('home.plan.open')}
                </Link>
              )}
              <Link className={`btn sm ${friend && !dreamer ? 'ghost' : ''}`} to={`/module/${next.id}`}>
                {t('common.continue')}
              </Link>
            </div>
          </>
        ) : modules.length === 0 ? (
          <div className="muted">…</div>
        ) : (
          <div>{t(dreamer ? 'home.next.allDone' : 'home.next.allDone.friend')}</div>
        )}
      </div>

      {dreamer && checkinDue && (
        <div className="card soft">
          <strong>{t('home.checkin.due')}</strong>
          <div>
            <Link className="btn sm" to="/vision#checkin">
              {t('home.checkin.open')}
            </Link>
          </div>
        </div>
      )}
      {dreamer && letterDue(vision?.letter, today()) && (
        <div className="card soft">
          <strong>{t('home.letter.due')}</strong>
          <div>
            <Link className="btn sm" to="/vision#letter">
              {t('home.letter.open')}
            </Link>
          </div>
        </div>
      )}

      {pair && (
        <label className="card row" style={{ cursor: 'pointer' }}>
          <input
            type="checkbox"
            key={String(settings.friendToday)}
            defaultChecked={settings.friendToday}
            onChange={(e) => update({ friendToday: e.target.checked })}
          />
          <span>
            {t('home.friendMode')}
            <br />
            <span className="small muted">{t('home.friendMode.help')}</span>
          </span>
        </label>
      )}

      {dreamer && <DreamerCards />}

      <h2>{t('modules.title')}</h2>
      <div className="progress" aria-hidden>
        {modules
          .filter((m) => m.order > 0)
          .map((m) => (
            <span key={m.id} className={done.has(m.id) ? 'on' : ''} />
          ))}
      </div>
      <ul className="list">
        {modules.map((m) => {
          const d = moduleDate(settings.startDate, settings.cadenceDays, m.order)
          return (
            <li key={m.id}>
              <Link to={`/module/${m.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <strong>
                  {m.order}. {m.title}
                </strong>{' '}
                {done.has(m.id) && '✓'}
                <div className="small muted">
                  {m.subtitle}
                  {d ? ` · ${fmtDate(d)}` : ''}
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** The Dreamer's own cards: chosen dream, if-then plans, worksheet links. */
function DreamerCards() {
  const { t } = useT()
  const plans = useOpenPlans()
  const chosen = useChosenDream()
  const WORK = [
    ['mydream', '/dream'],
    ['week', '/week'],
    ['calm', '/calm'],
    ['vision', '/vision'],
  ] as const
  return (
    <>
      <h2>{t('home.chosen')}</h2>
      <div className="card">
        {chosen ? (
          <>
            <strong>{chosen.text}</strong>
            <div>
              <Link className="btn sm" to="/dream">
                {t('home.chosen.open')}
              </Link>
            </div>
          </>
        ) : (
          <span className="muted">{t('home.chosen.none')}</span>
        )}
      </div>

      <h2>{t('home.plans')}</h2>
      <div className="card">
        {plans.length === 0 ? (
          <span className="muted">{t('home.plans.none')}</span>
        ) : (
          <>
            <ul className="list">
              {plans.map((p) => (
                <li key={p.id} className="row">
                  <input
                    type="checkbox"
                    aria-label={t('home.plans.done')}
                    title={t('home.plans.done')}
                    onChange={() => hidePlan(p)}
                  />
                  <span>
                    <em>{t('plan.if')}</em> {p.condition}, <em>{t('plan.then')}</em> {p.action}
                    <span className="small muted">
                      {' '}
                      · {t('home.module')} {Number(p.moduleId)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              {t('home.plans.help')}
            </p>
          </>
        )}
      </div>

      <h2>{t('home.work')}</h2>
      <div className="card">
        <p className="small muted" style={{ marginTop: 0 }}>
          {t('home.work.help')}
        </p>
        <div className="row">
          {WORK.map(([k, to]) => (
            <Link key={k} className="btn sm" to={to}>
              {t(`home.work.${k}`)}
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
