import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings } from '../state/settings'
import { submitDraft } from '../state/useAction'
import { showsFriendSection } from '../state/roles'
import { listPlanIds, loadPlan, md } from '../content/loader'
import { useContent, useModules } from '../content/useContent'
import { configOfHeading } from '../content/plans'
import { useModuleNotes, completedModuleIds, useFriendNotes, addFriendNote } from '../db/notes'
import { meetingIdsOf, nextMeeting } from '../lib/course'
import { TEXT_LONG } from '../db/db'
import type { Section } from '../content/frontmatter'

const configOf = (s: Section) => configOfHeading(s.title)

/** Dream Friend page (FR-60/61): the meeting plan, opened on the chosen configuration, and the Friend's own notes. */
export default function Friend() {
  const { t, locale } = useT()
  const { settings } = useSettings()
  const { id } = useParams()
  const nav = useNavigate()
  const lang = contentLocaleFor(locale)
  const planIds = useContent(`plans:${lang}`, () => listPlanIds(lang)) ?? []
  const moduleId = id && planIds.includes(id) ? id : null

  // without an id in the URL, open the next meeting's plan
  const notes = useModuleNotes()
  const modules = useModules()
  useEffect(() => {
    if (moduleId || !notes || !modules || planIds.length === 0) return
    const next = nextMeeting(meetingIdsOf(modules), completedModuleIds(notes))
    nav(`/friend/${next && planIds.includes(next) ? next : planIds[0]}`, { replace: true })
  }, [moduleId, notes, modules, planIds, nav])

  const doc = useContent(`plan:${lang}:${moduleId}`, () =>
    moduleId ? loadPlan(lang, moduleId) : Promise.resolve(null),
  )

  if (!showsFriendSection(settings)) return <p className="notice">{t('friend.hidden')}</p>
  if (!moduleId) return <p className="muted">…</p>

  const tables = doc ? doc.sections.filter((s) => configOf(s)) : []
  const chosen = tables.find((s) => configOf(s) === settings.config)
  const others = tables.filter((s) => s !== chosen)
  const rest = doc ? doc.sections.filter((s) => !configOf(s)) : []
  const notesLabel = t(settings.role === 'both' ? 'friend.notes.both' : 'friend.notes')

  return (
    <>
      <h1>{t('friend.title')}</h1>
      <div className="row">
        {planIds.map((m) => (
          <button key={m} className={`chip ${moduleId === m ? 'on' : ''}`} onClick={() => nav(`/friend/${m}`)}>
            {t('home.module')} {Number(m)}
          </button>
        ))}
        <span className="chip">{t(`onboarding.config.${settings.config}`)}</span>
      </div>
      <h2>{t('friend.plan')}</h2>
      {doc === undefined ? (
        <p className="muted">…</p>
      ) : doc === null ? (
        <p className="notice">{t('module.notFound')}</p>
      ) : (
        <div className="content" lang={contentLocaleFor(locale)}>
          <div dangerouslySetInnerHTML={{ __html: md(doc.preamble) }} />
          {chosen && (
            <div className="card">
              <h3 style={{ marginTop: 0 }}>{chosen.title}</h3>
              <div dangerouslySetInnerHTML={{ __html: md(chosen.body) }} />
            </div>
          )}
          {others.length > 0 && <p className="small muted">{t('friend.plan.help')}</p>}
          {others.map((s) => (
            <details key={s.id}>
              <summary>{s.title}</summary>
              <div dangerouslySetInnerHTML={{ __html: md(s.body) }} />
            </details>
          ))}
          {rest.map((s) => (
            <div key={s.id}>
              <h2>{s.title}</h2>
              <div dangerouslySetInnerHTML={{ __html: md(s.body) }} />
              {s.sub.map((x) => (
                <div key={x.id}>
                  <h3>{x.title}</h3>
                  <div dangerouslySetInnerHTML={{ __html: md(x.body) }} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
      <h2>{notesLabel}</h2>
      {/* keyed by meeting: a note being written belongs to this meeting and never follows to another plan */}
      <FriendNotes key={moduleId} moduleId={moduleId} label={notesLabel} />
    </>
  )
}

/** The Friend's own notes for one meeting (FR-61): the draft, and the notes already written, newest first. */
function FriendNotes({ moduleId, label }: { moduleId: string; label: string }) {
  const { t, fmtDate } = useT()
  const notes = useFriendNotes(moduleId)
  const [text, setText] = useState('')
  const add = submitDraft(
    text,
    setText,
    '',
    (typed) => addFriendNote(moduleId, typed),
    (typed) => !!typed.trim(),
  )
  return (
    <div className="card">
      <textarea
        aria-label={label}
        maxLength={TEXT_LONG}
        placeholder={t('friend.notes.placeholder')}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button className="btn" onClick={add} disabled={!text.trim()}>
        {t('friend.notes.add')}
      </button>
      {notes.length === 0 ? (
        <p className="small muted" style={{ marginBottom: 0 }}>
          {t('friend.notes.empty')}
        </p>
      ) : (
        <ul className="list small">
          {notes.map((n) => (
            <li key={n.id}>
              <span className="muted">{fmtDate(n.created)}</span> — {n.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
