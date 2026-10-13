import DreamerOnly from '../components/DreamerOnly'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import { useSettings } from '../state/settings'
import { db, today, mutateSettings, SABOTEURS, WHEEL_AREAS, SWLS_ITEMS, type Saboteur, type JournalEntry, type WheelSnapshot } from '../db/db'

/** Module 5 (L): saboteurs and strengths, the catch-the-saboteur journal, the short attention exercise, the Wheel of Life. */
export default function CalmPage() {
  return <DreamerOnly><Calm /></DreamerOnly>
}

function Calm() {
  const { t } = useT()
  return (
    <>
      <h1>{t('calm.title')}</h1>
      <p className="muted">{t('calm.intro')}</p>
      <div className="card soft">
        <div className="row small" style={{ gap: '4px 12px' }}>
          <a href="#profile">{t('calm.section.profile')}</a>
          <a href="#journal">{t('calm.section.journal')}</a>
          <a href="#rep">{t('calm.section.rep')}</a>
          <a href="#wheel">{t('calm.section.wheel')}</a>
        </div>
      </div>
      <Profile />
      <Journal />
      <Rep />
      <Wheel />
    </>
  )
}

function SectionHead({ id, label, title }: { id: string; label: string; title: string }) {
  return (
    <>
      <p className="small muted" id={id} style={{ marginBottom: -8, marginTop: 28 }}>{label}</p>
      <h2 style={{ marginTop: 12 }}>{title}</h2>
    </>
  )
}

/* ---------- 1. saboteurs and strengths ---------- */
function Profile() {
  const { t, fmtDate } = useT()
  const { settings } = useSettings()
  const uses = useLiveQuery(() => db.strengthUses.orderBy('date').reverse().toArray(), []) ?? []
  const [useText, setUseText] = useState('')
  const [useStrength, setUseStrength] = useState('')
  const top = settings.saboteurs
  // read the current list inside the handler: two quick taps must not overwrite each other
  const toggle = (s: Saboteur) => mutateSettings((cur) => {
    const list = cur.saboteurs
    if (list.includes(s)) return { saboteurs: list.filter((x) => x !== s) }
    return list.length < 3 ? { saboteurs: [...list, s] } : {}
  })
  const strengths = [...settings.strengths, '', '', '', '', ''].slice(0, 5)
  const setStrength = (i: number, v: string) => mutateSettings((cur) => { const n = [...cur.strengths, '', '', '', '', ''].slice(0, 5); n[i] = v; return { strengths: n } })
  const addUse = async () => {
    if (!useText.trim()) return
    await db.strengthUses.add({ date: today(), strength: useStrength || strengths.find(Boolean) || '', text: useText.trim() })
    setUseText('')
  }
  return (
    <>
      <SectionHead id="profile" label={t('calm.section.profile')} title={t('profile.title')} />
      <p className="muted small">{t('profile.help')}</p>
      <div className="card">
        <div className="field">
          <label>{t('profile.saboteurs')} <span className="muted">({top.length}/3)</span></label>
          <div className="row">
            {SABOTEURS.filter((s) => s !== 'judge').map((s) => <button key={s} className={`chip ${top.includes(s) ? 'on' : ''}`} onClick={() => toggle(s)} disabled={!top.includes(s) && top.length >= 3}>{t(`sab.${s}`)}</button>)}
          </div>
        </div>
        <p className="small"><strong>{t('sab.judge')}</strong> — {t('sab.judge.desc')}</p>
        {top.map((s) => <p key={s} className="small"><strong>{t(`sab.${s}`)}</strong> — {t(`sab.${s}.desc`)}</p>)}
        <p className="small muted">{t('profile.saboteurs.note')}</p>
      </div>
      <div className="card">
        <div className="field"><label>{t('profile.strengths')}</label></div>
        {strengths.map((s, i) => (
          <div className="field" key={i}>
            <label htmlFor={`str-${i}`}>{t('profile.strength', { n: i + 1 })}</label>
            <input id={`str-${i}`} type="text" placeholder={t(`profile.strength.placeholder.${i + 1}`)} defaultValue={s} onBlur={(e) => setStrength(i, e.target.value)} />
          </div>
        ))}
      </div>
      <h3>{t('profile.uses')}</h3>
      <p className="muted small">{t('profile.uses.help')}</p>
      <div className="card">
        <div className="field">
          <label htmlFor="use-strength">{t('profile.uses.which')}</label>
          <select id="use-strength" value={useStrength} onChange={(e) => setUseStrength(e.target.value)}>
            <option value="">{t('profile.uses.which.none')}</option>
            {strengths.filter(Boolean).map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="use-text">{t('profile.uses.what')}</label>
          <input id="use-text" type="text" placeholder={t('profile.uses.placeholder')} value={useText} onChange={(e) => setUseText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addUse()} />
        </div>
        <button className="btn" onClick={addUse} disabled={!useText.trim()}>{t('profile.uses.add')}</button>
        {uses.length > 0 && (
          <ul className="list small">
            {uses.map((u) => <li key={u.id}><span className="muted">{fmtDate(u.date)}</span> · <strong>{u.strength}</strong> — {u.text}</li>)}
          </ul>
        )}
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/profile">{t('profile.print')}</Link></p>
    </>
  )
}

/* ---------- 2. journal ---------- */
const JOURNAL_FIELDS = ['happened', 'thought', 'felt', 'did', 'friend'] as const
function Journal() {
  const { t, fmtDate } = useT()
  const entries = useLiveQuery(() => db.journal.orderBy('date').reverse().toArray(), []) ?? []
  const [draft, setDraft] = useState<Partial<JournalEntry>>({})
  const [open, setOpen] = useState(false)
  const save = async () => {
    if (!draft.happened?.trim()) return
    await db.journal.add({ ...draft, date: today() } as JournalEntry)
    setDraft({}); setOpen(false)
  }
  return (
    <>
      <SectionHead id="journal" label={t('calm.section.journal')} title={t('journal.title')} />
      <p className="muted small">{t('journal.help')}</p>
      {!open && <p><button className="btn primary" onClick={() => setOpen(true)}>{t('journal.new')}</button></p>}
      {open && (
        <div className="card">
          {JOURNAL_FIELDS.map((f) => (
            <div className="field" key={f}>
              <label htmlFor={`j-${f}`}>{t(`journal.${f}`)}</label>
              <textarea id={`j-${f}`} placeholder={t(`journal.${f}.placeholder`)} value={draft[f] ?? ''} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} style={{ minHeight: 64 }} />
            </div>
          ))}
          <div className="field">
            <label>{t('journal.saboteur')}</label>
            <div className="row">{SABOTEURS.map((s) => <button key={s} className={`chip ${draft.saboteur === s ? 'on' : ''}`} onClick={() => setDraft({ ...draft, saboteur: s })}>{t(`sab.${s}`)}</button>)}</div>
          </div>
          <div className="row">
            <button className="btn primary" onClick={save} disabled={!draft.happened?.trim()}>{t('journal.save')}</button>
            <button className="btn ghost" onClick={() => { setDraft({}); setOpen(false) }}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
      {entries.length === 0 && !open && <p className="muted" style={{ marginTop: 0 }}>{t('journal.empty')}</p>}
      {entries.map((e) => (
        <details className="card" key={e.id}>
          <summary>{fmtDate(e.date)} · {e.saboteur ? t(`sab.${e.saboteur}`) : t('journal.noSaboteur')} · {e.happened.slice(0, 40)}{e.happened.length > 40 ? '…' : ''}</summary>
          {JOURNAL_FIELDS.map((f) => e[f] ? <p key={f} className="small"><strong>{t(`journal.${f}`)}</strong> {e[f]}</p> : null)}
          <button className="btn sm ghost" onClick={() => db.journal.delete(e.id!)}>{t('journal.delete')}</button>
        </details>
      ))}
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/journal">{t('journal.print')}</Link></p>
    </>
  )
}

/* ---------- 3. short attention exercise ---------- */
const SENSES = ['touch', 'sound', 'breath', 'sight', 'weight'] as const
function Rep() {
  const { t } = useT()
  const [left, setLeft] = useState<number | null>(null)
  const [sense, setSense] = useState(0)
  const timer = useRef<number | null>(null)
  const reps = useLiveQuery(() => db.reps.count(), []) ?? 0
  const start = (secs: number) => {
    if (timer.current) window.clearInterval(timer.current)
    setSense(Math.floor(Math.random() * SENSES.length))
    setLeft(secs)
    timer.current = window.setInterval(() => setLeft((v) => {
      if (v === null) return null
      if (v <= 1) { window.clearInterval(timer.current!); timer.current = null; db.reps.add({ date: today(), seconds: secs }); return 0 }
      return v - 1
    }), 1000)
  }
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current) }, [])
  return (
    <>
      <SectionHead id="rep" label={t('calm.section.rep')} title={t('rep.title')} />
      <p className="muted small">{t('rep.help')}</p>
      <div className="card">
        <div className="row">
          {[10, 60, 120].map((s) => <button key={s} className="btn" onClick={() => start(s)}>{t(`rep.start.${s}`)}</button>)}
        </div>
        {left !== null && (
          <div className="card soft" aria-live="polite">
            <div style={{ fontSize: '2rem', fontWeight: 650, fontVariantNumeric: 'tabular-nums' }}>{left > 0 ? `${left}` : '✓'}</div>
            <p style={{ margin: 0 }}>{left > 0 ? t(`rep.sense.${SENSES[sense]}`) : t('rep.done')}</p>
          </div>
        )}
        <p className="small muted">{t('rep.count', { n: reps })}</p>
      </div>
      <h3>{t('rep.videos')}</h3>
      <p className="muted small">{t('rep.videos.help')}</p>
      <div className="card">
        <video controls preload="metadata" style={{ width: '100%', borderRadius: 8 }} src="./media/chamine-1.mp4" />
        <video controls preload="metadata" style={{ width: '100%', borderRadius: 8 }} src="./media/chamine-2.mp4" />
        <p className="small muted">{t('rep.videos.credit')}</p>
      </div>
    </>
  )
}

/* ---------- 4. wheel of life + life satisfaction ---------- */
export function WheelSvg({ values, size = 260 }: { values: number[]; size?: number }) {
  const n = WHEEL_AREAS.length, cx = size / 2, cy = size / 2, r = size / 2 - 8
  const pt = (i: number, v: number) => { const a = (Math.PI * 2 * i) / n - Math.PI / 2; const d = (r * v) / 10; return [cx + d * Math.cos(a), cy + d * Math.sin(a)] }
  const poly = values.map((v, i) => pt(i, v).join(',')).join(' ')
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: size, display: 'block', margin: '0 auto' }} role="img" aria-label="wheel">
      {[2, 4, 6, 8, 10].map((k) => <circle key={k} cx={cx} cy={cy} r={(r * k) / 10} fill="none" stroke="var(--line)" />)}
      {WHEEL_AREAS.map((_, i) => { const [x, y] = pt(i, 10); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" /> })}
      <polygon points={poly} fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeWidth="2" />
      {values.map((v, i) => { const [x, y] = pt(i, v); return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" /> })}
    </svg>
  )
}

function Wheel() {
  const { t, fmtDate } = useT()
  const snaps = useLiveQuery(() => db.wheels.orderBy('date').reverse().toArray(), []) ?? []
  const last = snaps[0]
  const [values, setValues] = useState<number[]>(last?.values ?? Array(WHEEL_AREAS.length).fill(5))
  const [swls, setSwls] = useState<number[]>(last?.swls ?? Array(SWLS_ITEMS.length).fill(0))
  const [seeded, setSeeded] = useState(false)
  useEffect(() => { if (last && !seeded) { setValues(last.values); setSwls(last.swls); setSeeded(true) } }, [last, seeded])
  const total = swls.reduce((a, b) => a + b, 0)
  const save = () => db.wheels.add({ date: today(), values, swls } as WheelSnapshot)
  return (
    <>
      <SectionHead id="wheel" label={t('calm.section.wheel')} title={t('wheel.title')} />
      <p className="muted small">{t('wheel.help')}</p>
      <div className="card">
        <WheelSvg values={values} />
        {WHEEL_AREAS.map((a, i) => (
          <div className="field" key={a}>
            <label htmlFor={`w-${a}`}>{t(`wheel.area.${a}`)} <strong>{values[i]}</strong></label>
            <input id={`w-${a}`} type="range" min={0} max={10} value={values[i]} onChange={(e) => { const v = [...values]; v[i] = Number(e.target.value); setValues(v) }} />
          </div>
        ))}
      </div>
      <h3>{t('swls.title')}</h3>
      <p className="muted small">{t('swls.help')}</p>
      <div className="card">
        {SWLS_ITEMS.map((k, i) => (
          <div className="field" key={k}>
            <label>{t(`swls.${k}`)}</label>
            <div className="row" role="radiogroup" aria-label={t(`swls.${k}`)}>
              {[1, 2, 3, 4, 5, 6, 7].map((v) => <button key={v} className={`chip ${swls[i] === v ? 'on' : ''}`} onClick={() => { const s = [...swls]; s[i] = v; setSwls(s) }} aria-pressed={swls[i] === v}>{v}</button>)}
            </div>
          </div>
        ))}
        <p className="small muted">{t('swls.scale')} · {t('swls.total', { n: total })}</p>
      </div>
      <p><button className="btn primary" onClick={save} disabled={swls.some((v) => v === 0)}>{t('wheel.save')}</button></p>
      {snaps.length > 0 && (
        <div className="card">
          <div className="small muted">{t('wheel.history')}</div>
          <ul className="list small">
            {snaps.map((s) => <li key={s.id}>{fmtDate(s.date)} · {t('wheel.avg', { n: (s.values.reduce((a, b) => a + b, 0) / s.values.length).toFixed(1) })} · {t('swls.total', { n: s.swls.reduce((a, b) => a + b, 0) })}</li>)}
          </ul>
        </div>
      )}
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/wheel">{t('wheel.print')}</Link></p>
    </>
  )
}
