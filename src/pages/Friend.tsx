import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings, showsFriendSection } from '../state/settings'
import { db, today, type Config, type FriendNote } from '../db/db'
import { listModules, loadPlan, md, type PlanDoc } from '../content/loader'
import { nextModule } from '../lib/course'
import type { Section } from '../content/frontmatter'

const PLAN_IDS = ['01', '02', '03', '04', '05', '06', '07']
/** A configuration's table is the `##` section whose title starts with its name (the duration may follow in parentheses). */
const HEADING_PREFIX: Record<Config, string> = { solo: 'Un Visător', pair: 'Pereche', group: 'Prieten al Visului și grup' }
const configOf = (s: Section): Config | null => (Object.keys(HEADING_PREFIX) as Config[]).find((c) => s.title.startsWith(HEADING_PREFIX[c])) ?? null

/** Dream Friend page (FR-60/61): the meeting plan, opened on the chosen configuration, and the Friend's own notes. */
export default function Friend() {
  const { t, locale, fmtDate } = useT()
  const { settings } = useSettings()
  const { id } = useParams()
  const nav = useNavigate()
  const moduleId = id && PLAN_IDS.includes(id) ? id : null

  // without an id in the URL, open the next meeting's plan
  const notes = useLiveQuery(() => db.moduleNotes.toArray(), [])
  useEffect(() => {
    if (moduleId || !notes) return
    listModules(contentLocaleFor(locale)).then((mods) => {
      const done = new Set(notes.filter((n) => n.completedOn).map((n) => n.moduleId))
      const next = nextModule(mods.filter((m) => m.order > 0), done)
      nav(`/friend/${next?.id ?? '01'}`, { replace: true })
    })
  }, [moduleId, notes, locale, nav])

  const [doc, setDoc] = useState<PlanDoc | null | undefined>(undefined)
  useEffect(() => { if (moduleId) loadPlan(contentLocaleFor(locale), moduleId).then(setDoc) }, [locale, moduleId])
  const friendNotes = useLiveQuery((): Promise<FriendNote[]> => moduleId ? db.friendNotes.where('moduleId').equals(moduleId).reverse().sortBy('created') : Promise.resolve([]), [moduleId]) ?? []
  const [text, setText] = useState('')

  if (!showsFriendSection(settings)) return <p className="notice">{t('friend.hidden')}</p>
  if (!moduleId) return <p className="muted">…</p>

  const add = async () => { if (!text.trim()) return; await db.friendNotes.add({ moduleId, text: text.trim(), created: today() }); setText('') }
  const tables = doc ? doc.sections.filter((s) => configOf(s)) : []
  const chosen = tables.find((s) => configOf(s) === settings.config)
  const others = tables.filter((s) => s !== chosen)
  const rest = doc ? doc.sections.filter((s) => !configOf(s)) : []
  const notesLabel = t(settings.role === 'both' ? 'friend.notes.both' : 'friend.notes')

  return (
    <>
      <h1>{t('friend.title')}</h1>
      <div className="row">
        {PLAN_IDS.map((m) => <button key={m} className={`chip ${moduleId === m ? 'on' : ''}`} onClick={() => nav(`/friend/${m}`)}>{t('home.module')} {Number(m)}</button>)}
        <span className="chip">{t(`onboarding.config.${settings.config}`)}</span>
      </div>
      <h2>{t('friend.plan')}</h2>
      {doc === undefined ? <p className="muted">…</p> : doc === null ? <p className="notice">{t('module.notFound')}</p> : (
        <div className="content">
          <div dangerouslySetInnerHTML={{ __html: md(doc.preamble) }} />
          {chosen && <div className="card"><h3 style={{ marginTop: 0 }}>{chosen.title}</h3><div dangerouslySetInnerHTML={{ __html: md(chosen.body) }} /></div>}
          {others.length > 0 && <p className="small muted">{t('friend.plan.help')}</p>}
          {others.map((s) => <details key={s.id}><summary>{s.title}</summary><div dangerouslySetInnerHTML={{ __html: md(s.body) }} /></details>)}
          {rest.map((s) => <div key={s.id}><h2>{s.title}</h2><div dangerouslySetInnerHTML={{ __html: md(s.body) }} />{s.sub.map((x) => <div key={x.id}><h3>{x.title}</h3><div dangerouslySetInnerHTML={{ __html: md(x.body) }} /></div>)}</div>)}
        </div>
      )}
      <h2>{notesLabel}</h2>
      <div className="card">
        <textarea aria-label={notesLabel} placeholder={t('friend.notes.placeholder')} value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" onClick={add} disabled={!text.trim()}>{t('friend.notes.add')}</button>
        {friendNotes.length === 0
          ? <p className="small muted" style={{ marginBottom: 0 }}>{t('friend.notes.empty')}</p>
          : <ul className="list small">{friendNotes.map((n) => <li key={n.id}><span className="muted">{fmtDate(n.created)}</span> — {n.text}</li>)}</ul>}
      </div>
    </>
  )
}
