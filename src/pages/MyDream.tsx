import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import { db, today, CLARIFY_STEPS, WOOP_STEPS, type ClarifyStep, type WoopStep, type DreamWork } from '../db/db'

/** The chosen dream's worksheet (FR-20): five clarification questions and three routes. Module 2. */
export default function MyDream() {
  const { t } = useT()
  const dream = useLiveQuery(() => db.dreams.where('chosen').equals(1).first(), [])
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

  const save = async (patch: Partial<DreamWork>) => {
    const cur = (await db.dreamWork.get(dream.id!)) ?? { dreamId: dream.id!, updated: today() }
    await db.dreamWork.put({ ...cur, ...patch, clarify: { ...(cur.clarify ?? {}), ...(patch.clarify ?? {}) }, woop: { ...(cur.woop ?? {}), ...(patch.woop ?? {}) }, updated: today() })
  }
  const setStep = (step: ClarifyStep, v: string) => save({ clarify: { [step]: v } })
  const routes = [...(work?.routes ?? []), '', '', ''].slice(0, 3)
  const setRoute = (i: number, v: string) => { const r = [...routes]; r[i] = v; save({ routes: r }) }
  const filled = CLARIFY_STEPS.filter((s) => (work?.clarify?.[s] ?? '').trim()).length
  const setWoop = (step: WoopStep, v: string) => save({ woop: { [step]: v } })
  const woopFilled = WOOP_STEPS.filter((s) => (work?.woop?.[s] ?? '').trim()).length

  return (
    <>
      <h1>{t('mydream.title')}</h1>
      <div className="card soft">
        <div className="small muted">{t('home.chosen')}</div>
        <div style={{ fontSize: '1.2rem', fontWeight: 650, marginTop: 2 }}>{dream.text}</div>
        <div className="small muted">{t('mydream.progress', { n: filled })}</div>
      </div>

      <p className="small muted" style={{ marginBottom: -8 }}>{t('mydream.section.clarify')}</p>
      <h2 style={{ marginTop: 12 }}>{t('mydream.clarify')}</h2>
      <p className="muted small">{t('mydream.clarify.help')}</p>
      {CLARIFY_STEPS.map((s) => (
        <div className="card" key={s}>
          <div className="field">
            <label htmlFor={`step-${s}`}><strong>{t(`clarify.${s}`)}</strong> — {t(`clarify.${s}.q`)}</label>
            <textarea id={`step-${s}`} placeholder={t(`clarify.${s}.placeholder`)} defaultValue={work?.clarify?.[s] ?? ''} onBlur={(e) => setStep(s, e.target.value)} />
          </div>
        </div>
      ))}

      <h2>{t('mydream.routes')}</h2>
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

      <p className="small muted" id="woop" style={{ marginBottom: -8, marginTop: 28 }}>{t('mydream.section.woop')}</p>
      <h2 style={{ marginTop: 12 }}>{t('woop.title')} <span className="small muted" style={{ fontWeight: 400 }}>· {t('woop.progress', { n: woopFilled })}</span></h2>
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
    </>
  )
}
