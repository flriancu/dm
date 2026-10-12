import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT, contentLocaleFor } from '../i18n'
import { useSettings, showsFriendSection } from '../state/settings'
import { db, today } from '../db/db'
import { loadDoc } from '../content/loader'

/** Dream Friend section (FR-60/61). Role-gated; notes in their own table. */
export default function Friend() {
  const { t, locale, fmtDate } = useT()
  const { settings } = useSettings()
  const [moduleId, setModuleId] = useState('01')
  const [doc, setDoc] = useState<{ meta: Record<string, unknown>; html: string } | null | undefined>(undefined)
  useEffect(() => { loadDoc(contentLocaleFor(locale), 'friend', moduleId).then(setDoc) }, [locale, moduleId])
  const notes = useLiveQuery(() => db.friendNotes.where('moduleId').equals(moduleId).reverse().sortBy('created'), [moduleId]) ?? []
  const [text, setText] = useState('')

  if (!showsFriendSection(settings)) return <p className="notice">{t('friend.hidden')}</p>

  const add = async () => { if (!text.trim()) return; await db.friendNotes.add({ moduleId, text: text.trim(), created: today() }); setText('') }

  return (
    <>
      <h1>{t('friend.title')}</h1>
      <div className="row">
        {['01'].map((m) => <button key={m} className={`chip ${moduleId === m ? 'on' : ''}`} onClick={() => setModuleId(m)}>{t('home.module')} {Number(m)}</button>)}
        <span className="chip">{t(`onboarding.config.${settings.config}`)}</span>
      </div>
      <h2>{t('friend.plan')}</h2>
      {doc ? <div className="content" dangerouslySetInnerHTML={{ __html: doc.html }} /> : <p className="muted">…</p>}
      <h2>{t('friend.notes')}</h2>
      <div className="card">
        <textarea value={text} onChange={(e) => setText(e.target.value)} />
        <button className="btn" onClick={add} disabled={!text.trim()}>{t('common.add')}</button>
        <ul className="list small">
          {notes.map((n) => <li key={n.id}><span className="muted">{fmtDate(n.created)}</span> — {n.text}</li>)}
        </ul>
      </div>
    </>
  )
}
