import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings, isFriendNow } from '../state/settings'
import { db, today } from '../db/db'
import { loadModule, md, type ModuleDoc } from '../content/loader'
import type { Section } from '../content/frontmatter'

const VARIANTS = ['solo', 'pair', 'group'] as const

export default function ModulePage() {
  const { id = '' } = useParams()
  const { t, locale } = useT()
  const { settings } = useSettings()
  const [doc, setDoc] = useState<ModuleDoc | null | undefined>(undefined)
  const contentLocale = contentLocaleFor(locale)
  useEffect(() => { loadModule(contentLocale, id).then(setDoc) }, [contentLocale, id])

  const note = useLiveQuery(() => db.moduleNotes.get(id), [id])
  const plans = useLiveQuery(() => db.plans.where('moduleId').equals(id).toArray(), [id]) ?? []

  const [cond, setCond] = useState('')
  const [act, setAct] = useState('')
  const [saved, setSaved] = useState(false)

  if (doc === undefined) return <p className="muted">…</p>
  if (doc === null) return <p className="notice">{t('module.notFound')} <Link to="/modules">{t('nav.modules')}</Link></p>

  const sec = (sid: string): Section | undefined => doc.sections.find((s) => s.id === sid)
  const friend = sec('friend')
  const ordered = [settings.config, ...VARIANTS.filter((v) => v !== settings.config)]
  const friendNow = isFriendNow(settings)

  const savePlan = async () => {
    if (!cond.trim() || !act.trim()) return
    await db.plans.add({ moduleId: id, condition: cond.trim(), action: act.trim(), created: today(), done: 0 })
    setCond(''); setAct(''); setSaved(true)
  }
  const saveNote = (patch: Record<string, string>) => db.moduleNotes.put({ moduleId: id, ...(note ?? {}), ...patch })
  const complete = () => saveNote({ completedOn: today() })

  return (
    <article className="content">
      <p className="small muted"><Link to="/modules">{t('nav.modules')}</Link> · {t('home.module')} {doc.meta.order}{doc.meta.letter ? ` · ${doc.meta.letter.split('').map((l) => `${l} · ${t(`letter.${l}`)}`).join(', ')}` : ''}</p>
      <h1>{doc.meta.title}</h1>
      {doc.meta.subtitle && <p className="muted">{doc.meta.subtitle}</p>}
      {(contentLocale as string) !== (locale as string) && <p className="notice small">{t('module.contentFallback')}</p>}

      {sec('learn') && <><h2>{t('module.learn')}</h2><div dangerouslySetInnerHTML={{ __html: md(sec('learn')!.body) }} /></>}

      {sec('do') && (
        <>
          <h2>{t('module.do')}</h2>
          <div dangerouslySetInnerHTML={{ __html: md(sec('do')!.body) }} />
          {sec('do')!.sub.map((s) => <div key={s.id}><h3>{s.title}</h3><div dangerouslySetInnerHTML={{ __html: md(s.body) }} /></div>)}
          {doc.meta.order === 1 && <p><Link className="btn" to="/dreams">{t('dreams.title')} →</Link></p>}
        </>
      )}

      {friend && (
        <>
          <h2>{t('module.friend')}{friendNow && <span className="chip on small" style={{ marginLeft: 8 }}>{t('home.friendMode')}</span>}</h2>
          {friend.body && <div dangerouslySetInnerHTML={{ __html: md(friend.body) }} />}
          {ordered.map((v, i) => {
            const s = friend.sub.find((x) => x.id === v)
            if (!s) return null
            const inner = <div dangerouslySetInnerHTML={{ __html: md(s.body) }} />
            return i === 0
              ? <div key={v} className="card"><h3 style={{ marginTop: 0 }}>{t(`module.friend.variant.${v}`)}</h3>{inner}</div>
              : <details key={v}><summary>{t(`module.friend.variant.${v}`)}</summary>{inner}</details>
          })}
        </>
      )}

      {sec('next') && (
        <>
          <h2>{t('module.next')}</h2>
          <div dangerouslySetInnerHTML={{ __html: md(sec('next')!.body) }} />
          <div className="card">
            <p className="small muted">{t('module.next.plan')}</p>
            <div className="field"><label htmlFor="plan-if">{t('module.next.if')}</label><input id="plan-if" type="text" placeholder={t('module.next.if.placeholder')} value={cond} onChange={(e) => setCond(e.target.value)} /></div>
            <div className="field"><label htmlFor="plan-then">{t('module.next.then')}</label><input id="plan-then" type="text" placeholder={t('module.next.then.placeholder')} value={act} onChange={(e) => setAct(e.target.value)} /></div>
            <button className="btn primary" onClick={savePlan} disabled={!cond.trim() || !act.trim()}>{t('common.save')}</button>
            {saved && <p className="small" style={{ color: 'var(--ok)' }}>{t('module.next.saved')}</p>}
            {plans.length > 0 && (
              <ul className="list small">
                {plans.map((p) => <li key={p.id} className={p.done ? 'muted' : ''}>{p.done ? '✓ ' : ''}{t('plan.if')} {p.condition}, {t('plan.then')} {p.action}</li>)}
              </ul>
            )}
          </div>
        </>
      )}

      <h2>{t('module.takeaway')}</h2>
      <p className="takeaway">{doc.meta.takeaway}</p>

      <div className="card">
        <div className="field">
          <label htmlFor="mine">{t('module.takeaways.mine')}</label>
          <textarea id="mine" placeholder={t('module.takeaways.placeholder')} defaultValue={note?.takeaways ?? ''} onBlur={(e) => saveNote({ takeaways: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="oneword">{t('module.feedback')}</label>
          <input id="oneword" type="text" maxLength={40} placeholder={t('module.feedback.placeholder')} defaultValue={note?.oneWord ?? ''} onBlur={(e) => saveNote({ oneWord: e.target.value })} />
        </div>
        <button className="btn primary" onClick={complete}>{note?.completedOn ? '✓ ' : ''}{t('common.done')}</button>
      </div>

    </article>
  )
}
