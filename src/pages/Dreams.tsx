import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import { useSettings } from '../state/settings'
import { db, today, AREAS, type Dream, type Area, type WhyTag } from '../db/db'

/** True when the top-scored dreams are all extrinsic (FR-11 warning). */
export function extrinsicWarning(dreams: Dream[], top = 3): boolean {
  const scored = dreams.filter((d) => d.score && !d.dateReleased && !d.dateAchieved).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, top)
  return scored.length >= top && scored.every((d) => d.why === 'extrinsic')
}

export default function Dreams() {
  const { t, fmtDate } = useT()
  const { settings, update } = useSettings()
  const dreams = useLiveQuery(() => db.dreams.toArray(), []) ?? []
  const [text, setText] = useState('')
  const [sort, setSort] = useState<'date' | 'score'>('date')
  const [open, setOpen] = useState<number | null>(null)

  const live = dreams.filter((d) => !d.dateReleased)
  const count = settings.paperMode ? settings.paperCount : live.length
  const sorted = [...dreams].sort((a, b) => sort === 'score' ? (b.score ?? 0) - (a.score ?? 0) : (a.id ?? 0) - (b.id ?? 0))

  const add = async () => {
    const v = text.trim(); if (!v) return
    setText('')   // clear first, so a quickly typed next dream is never wiped by a late clear
    await db.dreams.add({ text: v, dateAdded: today(), chosen: 0 })
  }
  const patch = (d: Dream, p: Partial<Dream>) => db.dreams.update(d.id!, p)
  const choose = async (d: Dream) => {
    await db.transaction('rw', db.dreams, async () => {
      await db.dreams.where('chosen').equals(1).modify({ chosen: 0 })
      await db.dreams.update(d.id!, { chosen: 1 })
    })
  }

  return (
    <>
      <h1>{t('dreams.title')}</h1>
      <p className="muted">{t('dreams.count', { n: count })}</p>

      {settings.paperMode ? (
        <div className="card">
          <p>{t('dreams.paper')}</p>
          <div className="field">
            <label htmlFor="pc">{t('dreams.paper.count')}</label>
            <input id="pc" type="number" min={0} max={100} placeholder={t('dreams.paper.count.placeholder')} value={settings.paperCount} onChange={(e) => update({ paperCount: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })} />
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="row">
            <input type="text" aria-label={t('dreams.add.label')} placeholder={t('dreams.add.placeholder')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} style={{ flex: 1, minWidth: 200 }} />
            <button className="btn primary" onClick={add} disabled={!text.trim()}>{t('dreams.add.button')}</button>
          </div>
        </div>
      )}

      {extrinsicWarning(dreams) && <p className="notice small">{t('dreams.warn.extrinsic')}</p>}

      {!settings.paperMode && dreams.length === 0 && <p className="muted" style={{ marginTop: 0 }}>{t('dreams.empty')}</p>}
      {dreams.length > 0 && (
        <div className="row no-print" style={{ margin: '8px 0' }}>
          <button className={`chip ${sort === 'date' ? 'on' : ''}`} onClick={() => setSort('date')}>{t('dreams.sort.date')}</button>
          <button className={`chip ${sort === 'score' ? 'on' : ''}`} onClick={() => setSort('score')}>{t('dreams.sort.score')}</button>
        </div>
      )}

      <ul className="list">
        {sorted.map((d, i) => (
          <li key={d.id} className={`dream ${d.chosen ? 'chosen' : ''} ${d.dateAchieved ? 'achieved' : ''}`}>
            <span className="num">{i + 1}.</span>
            <div>
              <div className="text" onClick={() => setOpen(open === d.id ? null : d.id!)} style={{ cursor: 'pointer' }}>{d.text}</div>
              <div className="meta small muted">
                {d.chosen ? <span className="chip on">{t('dreams.chosen')}</span> : null}
                {d.score ? <span>{d.score}/10</span> : null}
                {d.area ? <span>{t(`area.${d.area}`)}</span> : null}
                {d.why ? <span>{t(`dreams.tag.${d.why}`)}</span> : null}
                {d.dateAchieved ? <span>{t('dreams.achieved.on', { date: fmtDate(d.dateAchieved) })}</span> : <span>{t('dreams.added.on', { date: fmtDate(d.dateAdded) })}</span>}
                {d.dateReleased ? <span>{t('dreams.released', { date: fmtDate(d.dateReleased) })}</span> : null}
              </div>
              {open === d.id && (
                <div className="card" style={{ marginTop: 8 }}>
                  <div className="field">
                    <label htmlFor={`score-${d.id}`}>{t('dreams.score')}</label>
                    <input id={`score-${d.id}`} className="score" type="number" min={1} max={10} value={d.score ?? ''} onChange={(e) => patch(d, { score: e.target.value ? Math.max(1, Math.min(10, Number(e.target.value))) : undefined })} />
                  </div>
                  <div className="field">
                    <label htmlFor={`area-${d.id}`}>{t('dreams.area')}</label>
                    <select id={`area-${d.id}`} value={d.area ?? ''} onChange={(e) => patch(d, { area: (e.target.value || undefined) as Area | undefined })}>
                      <option value="">{t('dreams.area.none')}</option>
                      {AREAS.map((a) => <option key={a} value={a}>{t(`area.${a}`)}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>{t('dreams.tag')}</label>
                    <div className="row">
                      {(['intrinsic', 'extrinsic'] as WhyTag[]).map((w) => (
                        <button key={w} className={`chip ${d.why === w ? 'on' : ''}`} onClick={() => patch(d, { why: d.why === w ? undefined : w })}>{t(`dreams.tag.${w}`)}</button>
                      ))}
                    </div>
                    <p className="small muted">{t('dreams.tag.help')}</p>
                  </div>
                  <div className="row">
                    {!d.chosen && !d.dateAchieved && !d.dateReleased && <button className="btn sm" onClick={() => choose(d)}>{t('dreams.choose')}</button>}
                    {!d.dateAchieved
                      ? <button className="btn sm" onClick={() => patch(d, { dateAchieved: today(), chosen: 0 })}>{t('dreams.achieved.mark')}</button>
                      : <button className="btn sm ghost" onClick={() => patch(d, { dateAchieved: undefined })}>{t('dreams.achieved.unmark')}</button>}
                    {!d.dateReleased && !d.dateAchieved && <button className="btn sm ghost" onClick={() => patch(d, { dateReleased: today(), chosen: 0 })}>{t('dreams.release')}</button>}
                  </div>
                </div>
              )}
            </div>
            <span />
          </li>
        ))}
      </ul>

      <Criteria />
    </>
  )
}

function Criteria() {
  const { t } = useT()
  const { settings, update } = useSettings()
  const [v, setV] = useState('')
  const add = () => { if (!v.trim()) return; update({ criteria: [...settings.criteria, v.trim()] }); setV('') }
  return (
    <details className="card" style={{ marginTop: 24 }}>
      <summary>{t('dreams.criteria')}</summary>
      <p className="small muted">{t('dreams.criteria.help')}</p>
      <ul className="list small">
        <li className="muted">★ {t('dreams.criteria.fixed')} <span className="small">({t('dreams.criteria.fixedNote')})</span></li>
        {settings.criteria.map((c, i) => (
          <li key={i} className="row" style={{ justifyContent: 'space-between' }}>
            <span>{i + 1}. {c}</span>
            <button className="btn sm ghost" aria-label={t('common.delete')} onClick={() => update({ criteria: settings.criteria.filter((_, j) => j !== i) })}>✕</button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input type="text" aria-label={t('dreams.criteria.add')} placeholder={t('dreams.criteria.placeholder')} value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} style={{ flex: 1, minWidth: 160 }} />
        <button className="btn sm" onClick={add} disabled={!v.trim()}>{t('dreams.criteria.add')}</button>
      </div>
    </details>
  )
}
