import DreamerOnly from '../components/DreamerOnly'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import {
  db, today, CLARIFY_STEPS, WOOP_STEPS, HABIT_PARTS, FRIEND_ROLES, weekStart,
  type ClarifyStep, type WoopStep, type HabitPart, type DreamWork, type DreamFriend, type HabitWeek,
} from '../db/db'

/** The chosen dream's worksheets: module 2 (clarify, routes), 3 (WOOP), 4 (habit, friends, fear), and letting go (FR-46). */
const LETGO_SIGNS = ['oscillate', 'sleep', 'stalled', 'outside'] as const
export default function MyDreamPage() {
  return <DreamerOnly><MyDream /></DreamerOnly>
}

function MyDream() {
  const { t, fmtDate } = useT()
  // the chosen dream, or the most recently released one (so the letting-go note stays visible)
  const dream = useLiveQuery(async () => (await db.dreams.where('chosen').equals(1).first()) ?? (await db.dreams.orderBy('dateReleased').reverse().first()) ?? null, [])
  const work = useLiveQuery(() => (dream?.id ? db.dreamWork.get(dream.id) : undefined), [dream?.id])

  if (dream === undefined) return <p className="muted">…</p>
  if (!dream) {
    return (
      <>
        <h1>{t('mydream.title')}</h1>
        <p className="notice">{t('mydream.none')} <Link to="/dreams">{t('nav.dreams')}</Link></p>
      </>
    )
  }

  // Read-modify-write inside one transaction, so two quick edits never overwrite each other.
  const save = (patch: Partial<DreamWork>) => db.transaction('rw', db.dreamWork, async () => {
    const cur = (await db.dreamWork.get(dream.id!)) ?? { dreamId: dream.id!, updated: today() }
    await db.dreamWork.put({
      ...cur, ...patch,
      clarify: { ...(cur.clarify ?? {}), ...(patch.clarify ?? {}) },
      woop: { ...(cur.woop ?? {}), ...(patch.woop ?? {}) },
      habit: { ...(cur.habit ?? {}), ...(patch.habit ?? {}) },
      fear: { ...(cur.fear ?? {}), ...(patch.fear ?? {}) },
      letgo: { ...(cur.letgo ?? {}), ...(patch.letgo ?? {}) },
      updated: today(),
    })
  })
  const setStep = (step: ClarifyStep, v: string) => save({ clarify: { [step]: v } })
  const routes = [...(work?.routes ?? []), '', '', ''].slice(0, 3)
  const setRoute = (i: number, v: string) => { const r = [...routes]; r[i] = v; save({ routes: r }) }
  const filled = CLARIFY_STEPS.filter((s) => (work?.clarify?.[s] ?? '').trim()).length
  const setWoop = (step: WoopStep, v: string) => save({ woop: { [step]: v } })
  const woopFilled = WOOP_STEPS.filter((s) => (work?.woop?.[s] ?? '').trim()).length
  const setHabit = (part: HabitPart, v: string) => save({ habit: { [part]: v } })
  const friends: DreamFriend[] = [...(work?.friends ?? []), {}, {}, {}].slice(0, 3)
  const setFriend = (i: number, p: Partial<DreamFriend>) => { const f = friends.map((x) => ({ ...x })); f[i] = { ...f[i], ...p }; save({ friends: f }) }
  const setFear = (k: 'fear' | 'goodEnough', v: string) => save({ fear: { [k]: v } })

  // weekly log: this week plus the weeks already logged, newest first (FR-22)
  const thisWeek = weekStart(today())
  const logged = new Map((work?.habitLog ?? []).map((w) => [w.week, w]))
  const weeks = Array.from(new Set([thisWeek, ...logged.keys()])).sort().reverse()
  const setWeek = (week: string, p: Partial<HabitWeek>) => {
    const next = new Map(logged); next.set(week, { week, ...(logged.get(week) ?? {}), ...p })
    save({ habitLog: Array.from(next.values()) })
  }
  const doneWeeks = (work?.habitLog ?? []).filter((w) => w.done).length

  const Section = ({ id, label, title, right }: { id: string; label: string; title: string; right?: string }) => (
    <>
      <p className="small muted" id={id} style={{ marginBottom: -8, marginTop: 28 }}>{label}</p>
      <h2 style={{ marginTop: 12 }}>{title}{right && <span className="small muted" style={{ fontWeight: 400 }}> · {right}</span>}</h2>
    </>
  )

  return (
    <>
      <h1>{t('mydream.title')}</h1>
      <div className="card soft">
        <div className="small muted">{t('home.chosen')}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 650, marginTop: 2 }}>{dream.text}</div>
        <div className="row small" style={{ gap: '4px 12px' }}>
          <a href="#clarify">{t('mydream.section.clarify')}</a>
          <a href="#woop">{t('mydream.section.woop')}</a>
          <a href="#habit">{t('mydream.section.habit')}</a>
          <a href="#friends">{t('mydream.section.friends')}</a>
          <a href="#fear">{t('mydream.section.fear')}</a>
          <a href="#letgo">{t('mydream.section.letgo')}</a>
        </div>
      </div>

      <Section id="clarify" label={t('mydream.section.clarify')} title={t('mydream.clarify')} right={t('mydream.progress', { n: filled })} />
      <p className="muted small">{t('mydream.clarify.help')}</p>
      {CLARIFY_STEPS.map((s) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`step-${s}`}><strong>{t(`clarify.${s}`)}</strong> — {t(`clarify.${s}.q`)}</label>
            <textarea id={`step-${s}`} placeholder={t(`clarify.${s}.placeholder`)} defaultValue={work?.clarify?.[s] ?? ''} onBlur={(e) => setStep(s, e.target.value)} />
          </div>
        </div>
      ))}
      <h3>{t('mydream.routes')}</h3>
      <p className="muted small">{t('mydream.routes.help')}</p>
      <div className="card">
        {routes.map((r, i) => (
          <div className="field" key={i}>
            <label htmlFor={`route-${i}`}>{t('mydream.route', { n: i + 1 })}</label>
            <input id={`route-${i}`} type="text" placeholder={t(`mydream.route.placeholder.${i + 1}`)} defaultValue={r} onBlur={(e) => setRoute(i, e.target.value)} />
          </div>
        ))}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/clarify">{t('mydream.print')}</Link></p>

      <Section id="woop" label={t('mydream.section.woop')} title={t('woop.title')} right={t('woop.progress', { n: woopFilled })} />
      <p className="muted small">{t('woop.help')}</p>
      {WOOP_STEPS.map((s) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`woop-${s}`}><strong>{t(`woop.${s}`)}</strong> — {t(`woop.${s}.q`)}</label>
            <textarea id={`woop-${s}`} placeholder={t(`woop.${s}.placeholder`)} defaultValue={work?.woop?.[s] ?? ''} onBlur={(e) => setWoop(s, e.target.value)} />
          </div>
        </div>
      ))}
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/woop">{t('woop.print')}</Link></p>

      <Section id="habit" label={t('mydream.section.habit')} title={t('habit.title')} right={t('habit.weeks', { n: doneWeeks })} />
      <p className="muted small">{t('habit.help')}</p>
      <div className="card">
        {HABIT_PARTS.map((p) => (
          <div className="field" key={p}>
            <label htmlFor={`habit-${p}`}><strong>{t(`habit.${p}`)}</strong> — {t(`habit.${p}.q`)}</label>
            <input id={`habit-${p}`} type="text" placeholder={t(`habit.${p}.placeholder`)} defaultValue={work?.habit?.[p] ?? ''} onBlur={(e) => setHabit(p, e.target.value)} />
          </div>
        ))}
        <p className="small"><em>{[work?.habit?.anchor, work?.habit?.behaviour, work?.habit?.celebration].filter(Boolean).join(' ') || t('habit.sentence.empty')}</em></p>
      </div>
      <h3>{t('habit.log')}</h3>
      <p className="muted small">{t('habit.log.help')}</p>
      <div className="card">
        {weeks.map((w) => {
          const row = logged.get(w)
          return (
            <div key={w} className="field">
              <label className="row" style={{ minHeight: 32 }}>
                <input type="checkbox" key={`${w}-${row?.done ? 1 : 0}`} defaultChecked={!!row?.done} onChange={(e) => setWeek(w, { done: e.target.checked })} />
                <span>{t('habit.week.of', { date: fmtDate(w) })}{w === thisWeek ? ` (${t('habit.week.this')})` : ''}: {t('habit.week.done')}</span>
              </label>
              <input type="text" aria-label={t('habit.note.label', { date: fmtDate(w) })} placeholder={t('habit.note.placeholder')} defaultValue={row?.note ?? ''} onBlur={(e) => setWeek(w, { note: e.target.value })} />
            </div>
          )
        })}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/habit">{t('habit.print')}</Link></p>

      <Section id="friends" label={t('mydream.section.friends')} title={t('friends.title')} />
      <p className="muted small">{t('friends.help')}</p>
      {friends.map((f, i) => (
        <div className="card" key={i}>
          <div className="field">
            <label htmlFor={`friend-name-${i}`}>{t('friends.name', { n: i + 1 })}</label>
            <input id={`friend-name-${i}`} type="text" placeholder={t('friends.name.placeholder')} defaultValue={f.name ?? ''} onBlur={(e) => setFriend(i, { name: e.target.value })} />
          </div>
          <div className="field">
            <label>{t('friends.role')}</label>
            <div className="row">
              {FRIEND_ROLES.map((r) => <button key={r} className={`chip ${f.role === r ? 'on' : ''}`} onClick={() => setFriend(i, { role: r })}>{t(`friends.role.${r}`)}</button>)}
            </div>
            {f.role && <p className="small muted">{t(`friends.role.${f.role}.help`)}</p>}
          </div>
          {f.role === 'ask' && (
            <div className="field">
              <label htmlFor={`friend-ask-${i}`}>{t('friends.ask')}</label>
              <textarea id={`friend-ask-${i}`} placeholder={t('friends.ask.placeholder')} defaultValue={f.ask ?? ''} onBlur={(e) => setFriend(i, { ask: e.target.value })} />
            </div>
          )}
          {f.role === 'progress' && (
            <div className="field">
              <label htmlFor={`friend-day-${i}`}>{t('friends.day')}</label>
              <input id={`friend-day-${i}`} type="text" placeholder={t('friends.day.placeholder')} defaultValue={f.day ?? ''} onBlur={(e) => setFriend(i, { day: e.target.value })} />
            </div>
          )}
        </div>
      ))}
      <p className="small muted">{t('friends.note')} <Link to="/book/print/friends">{t('friends.print')}</Link></p>

      <Section id="fear" label={t('mydream.section.fear')} title={t('fear.title')} />
      <p className="muted small">{t('fear.help')}</p>
      <div className="card">
        <div className="field">
          <label htmlFor="fear-fear"><strong>{t('fear.fear')}</strong> — {t('fear.fear.q')}</label>
          <textarea id="fear-fear" placeholder={t('fear.fear.placeholder')} defaultValue={work?.fear?.fear ?? ''} onBlur={(e) => setFear('fear', e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="fear-good"><strong>{t('fear.goodEnough')}</strong> — {t('fear.goodEnough.q')}</label>
          <textarea id="fear-good" placeholder={t('fear.goodEnough.placeholder')} defaultValue={work?.fear?.goodEnough ?? ''} onBlur={(e) => setFear('goodEnough', e.target.value)} />
        </div>
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/fear">{t('fear.print')}</Link></p>

      <Section id="letgo" label={t('mydream.section.letgo')} title={t('letgo.title')} />
      <p className="muted small">{t('letgo.help')}</p>
      <div className="card">
        <div className="field">
          <label>{t('letgo.signs')}</label>
          {LETGO_SIGNS.map((s) => (
            <label key={s} className="row" style={{ minHeight: 32 }}>
              <input type="checkbox" key={`${s}-${(work?.letgo?.signs ?? []).includes(s) ? 1 : 0}`} defaultChecked={(work?.letgo?.signs ?? []).includes(s)} onChange={(e) => { const cur = work?.letgo?.signs ?? []; save({ letgo: { signs: e.target.checked ? [...cur, s] : cur.filter((x) => x !== s) } }) }} />
              <span>{t(`letgo.sign.${s}`)}</span>
            </label>
          ))}
        </div>
        {(['costs', 'benefits', 'replacement'] as const).map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`letgo-${k}`}>{t(`letgo.${k}`)}</label>
            <textarea id={`letgo-${k}`} placeholder={t(`letgo.${k}.placeholder`)} defaultValue={work?.letgo?.[k] ?? ''} onBlur={(e) => save({ letgo: { [k]: e.target.value } })} style={{ minHeight: 64 }} />
          </div>
        ))}
        {dream.dateReleased ? (
          <p className="notice small">{t('letgo.released', { date: fmtDate(dream.dateReleased) })} <Link to="/dreams">{t('dreams.title')} →</Link></p>
        ) : (
          <>
            {work?.letgo?.decision === 'continue' && work.letgo.decided && <p className="small muted">{t('letgo.continued', { date: fmtDate(work.letgo.decided) })}</p>}
            <div className="row">
              <button className="btn" onClick={() => save({ letgo: { decision: 'continue', decided: today() } })}>{t('letgo.continue')}</button>
              <button className="btn ghost" onClick={async () => { await save({ letgo: { decision: 'release', decided: today() } }); await db.dreams.update(dream.id!, { dateReleased: today(), chosen: 0 }) }}>{t('letgo.release')}</button>
            </div>
          </>
        )}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/letgo">{t('letgo.print')}</Link></p>
    </>
  )
}
