import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings } from '../state/settings'
import { useAction, submitDraft } from '../state/useAction'
import { showsDreamerParts, leadsMeetings } from '../state/roles'
import { loadModule, md } from '../content/loader'
import { useContent, useModules } from '../content/useContent'
import { toolsFor } from '../content/tools'
import { orderedConfigs } from '../content/plans'
import { useModuleNote, patchModuleNote, markMeetingHeld, unmarkMeetingHeld, usePlansOf, addPlan } from '../db/notes'
import { meetingIdsOf } from '../lib/course'
import { TEXT_SHORT, TEXT_WORD } from '../db/db'
import AutoText from '../components/AutoText'
import type { Section } from '../content/frontmatter'

export default function ModulePage() {
  const { id = '' } = useParams()
  const { t, locale, fmtDate } = useT()
  const { settings } = useSettings()
  const contentLocale = contentLocaleFor(locale)
  const doc = useContent(`module:${contentLocale}:${id}`, () => loadModule(contentLocale, id))
  const modules = useModules()
  const note = useModuleNote(id)
  // whether this meeting passes the pair lead is decided in the data module, from the stored notes
  const [complete, completing] = useAction(() => markMeetingHeld(id, meetingIdsOf(modules ?? [])))
  const [undo, undoing] = useAction(() => unmarkMeetingHeld(id))

  // wait for this module's own note: the boxes below must not start from the previous module's text
  if (doc === undefined || note === undefined || modules === undefined) return <p className="muted">…</p>
  if (doc === null)
    return (
      <p className="notice">
        {t('module.notFound')} <Link to="/modules">{t('nav.modules')}</Link>
      </p>
    )

  const sec = (sid: string): Section | undefined => doc.sections.find((s) => s.id === sid)
  const friend = sec('friend')
  const ordered = orderedConfigs(settings.config)
  const dreamer = showsDreamerParts(settings)
  const isZero = doc.meta.order === 0
  const lead = leadsMeetings(settings) // 'me' | 'other' | null: who leads the next meeting on this device

  const saveNote = (patch: Record<string, string>) => patchModuleNote(id, patch)

  return (
    <article className="content" lang={contentLocale}>
      <p className="small muted">
        <Link to="/modules">{t('nav.modules')}</Link> · {t('home.module')} {doc.meta.order}
        {doc.meta.letter
          ? ` · ${doc.meta.letter
              .split('')
              .map((l) => `${l} · ${t(`letter.${l}`)}`)
              .join(', ')}`
          : ''}
      </p>
      <h1>{doc.meta.title}</h1>
      {doc.meta.subtitle && <p className="muted">{doc.meta.subtitle}</p>}
      {(contentLocale as string) !== (locale as string) && (
        <p className="notice small">{t('module.contentFallback')}</p>
      )}

      {sec('learn') && (
        <>
          <h2>{t('module.learn')}</h2>
          <div dangerouslySetInnerHTML={{ __html: md(sec('learn')!.body) }} />
        </>
      )}

      {sec('do') && (
        <>
          <h2>{t('module.do')}</h2>
          <div dangerouslySetInnerHTML={{ __html: md(sec('do')!.body) }} />
          {sec('do')!.sub.map((s) => (
            <div key={s.id}>
              <h3>{s.title}</h3>
              <div dangerouslySetInnerHTML={{ __html: md(s.body) }} />
            </div>
          ))}
          {dreamer && toolsFor(doc.meta).length > 0 && (
            <p className="row">
              {toolsFor(doc.meta).map((tool) => (
                <Link key={tool.id} className="btn" to={tool.to}>
                  {t(tool.labelKey)} →
                </Link>
              ))}
            </p>
          )}
        </>
      )}

      {friend && (
        <>
          <h2>
            {t('module.friend')}
            {lead && !isZero && (
              <span className="chip on small" style={{ marginLeft: 8 }}>
                {t(lead === 'me' ? 'module.lead.me' : 'module.lead.other')}
              </span>
            )}
          </h2>
          {friend.body && <div dangerouslySetInnerHTML={{ __html: md(friend.body) }} />}
          {ordered.map((v, i) => {
            const s = friend.sub.find((x) => x.id === v)
            if (!s) return null
            const inner = <div dangerouslySetInnerHTML={{ __html: md(s.body) }} />
            return i === 0 ? (
              <div key={v} className="card">
                <h3 style={{ marginTop: 0 }}>{t(`module.friend.variant.${v}`)}</h3>
                {inner}
              </div>
            ) : (
              <details key={v}>
                <summary>{t(`module.friend.variant.${v}`)}</summary>
                {inner}
              </details>
            )
          })}
        </>
      )}

      {sec('next') && (
        <>
          <h2>{t('module.next')}</h2>
          <div dangerouslySetInnerHTML={{ __html: md(sec('next')!.body) }} />
          {dreamer && <PlanForm moduleId={id} />}
        </>
      )}

      <h2>{t('module.takeaway')}</h2>
      <p className="takeaway">{doc.meta.takeaway}</p>

      {!dreamer && (
        <p className="notice">
          {t('module.friendNote')} <Link to={`/friend/${id}`}>{t('nav.friend')} →</Link>
        </p>
      )}

      <div className="card">
        {dreamer && (
          <div className="field">
            <label htmlFor="mine">{t('module.takeaways.mine')}</label>
            <AutoText
              id="mine"
              multiline
              placeholder={t('module.takeaways.placeholder')}
              value={note?.takeaways ?? ''}
              onSave={(v) => saveNote({ takeaways: v })}
            />
          </div>
        )}
        {dreamer && !isZero && (
          <div className="field">
            <label htmlFor="oneword">{t('module.feedback')}</label>
            <AutoText
              id="oneword"
              maxLength={TEXT_WORD}
              placeholder={t('module.feedback.placeholder')}
              value={note?.oneWord ?? ''}
              onSave={(v) => saveNote({ oneWord: v })}
            />
          </div>
        )}
        {note?.completedOn ? (
          <p className="row" style={{ margin: 0 }}>
            <span>
              ✓ {t(isZero ? 'common.done.0' : 'common.done')} · {fmtDate(note.completedOn)}
            </span>
            <button className="btn sm ghost" onClick={() => undo()} disabled={undoing}>
              {t('module.done.undo')}
            </button>
          </p>
        ) : (
          <>
            <button className="btn primary" onClick={() => complete()} disabled={completing}>
              {t(isZero ? 'common.done.0' : 'common.done')}
            </button>
            <p className="small muted" style={{ margin: '8px 0 0' }}>
              {t(isZero ? 'module.done.help.0' : 'module.done.help')}
            </p>
          </>
        )}
      </div>
    </article>
  )
}

/** The if-then plan for "Până data viitoare" (FR-14): saved to the plans table, listed on Home. */
const NO_PLAN = { cond: '', act: '' }

function PlanForm({ moduleId }: { moduleId: string }) {
  const { t } = useT()
  const plans = usePlansOf(moduleId)
  const [draft, setDraft] = useState(NO_PLAN)
  const [saved, setSaved] = useState(false)
  const savePlan = submitDraft(
    draft,
    setDraft,
    NO_PLAN,
    async (d) => {
      await addPlan(moduleId, d.cond, d.act)
      setSaved(true)
    },
    (d) => !!d.cond.trim() && !!d.act.trim(),
  )
  return (
    <div className="card">
      <p className="small muted">{t('module.next.plan')}</p>
      <div className="field">
        <label htmlFor="plan-if">{t('module.next.if')}</label>
        <input
          id="plan-if"
          type="text"
          maxLength={TEXT_SHORT}
          placeholder={t('module.next.if.placeholder')}
          value={draft.cond}
          onChange={(e) => setDraft({ ...draft, cond: e.target.value })}
        />
      </div>
      <div className="field">
        <label htmlFor="plan-then">{t('module.next.then')}</label>
        <input
          id="plan-then"
          type="text"
          maxLength={TEXT_SHORT}
          placeholder={t('module.next.then.placeholder')}
          value={draft.act}
          onChange={(e) => setDraft({ ...draft, act: e.target.value })}
        />
      </div>
      <button className="btn primary" onClick={savePlan} disabled={!draft.cond.trim() || !draft.act.trim()}>
        {t('common.save')}
      </button>
      {saved && (
        <p className="small" style={{ color: 'var(--ok)' }}>
          {t('module.next.saved')}
        </p>
      )}
      {plans.length > 0 && (
        <ul className="list small">
          {plans.map((p) => (
            <li key={p.id} className={p.done ? 'muted' : ''}>
              {p.done ? '✓ ' : ''}
              {t('plan.if')} {p.condition}, {t('plan.then')} {p.action}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
