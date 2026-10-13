import DreamerOnly from '../components/DreamerOnly'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import Stepper from '../components/Stepper'
import AutoText from '../components/AutoText'
import { useT } from '../i18n'
import { useSettings } from '../state/settings'
import { useDreams, addDream, patchDream, chooseDream, releaseDream, setPaperChosen } from '../db/dreams'
import { today, mutateSettings, AREAS, type Dream, type Area, type WhyTag } from '../db/db'

/** True when the top-scored dreams are all extrinsic (FR-11 warning). */
export function extrinsicWarning(dreams: Dream[], top = 3): boolean {
  const scored = dreams
    .filter((d) => d.score && !d.dateReleased && !d.dateAchieved)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, top)
  return scored.length >= top && scored.every((d) => d.why === 'extrinsic')
}

export default function DreamsPage() {
  return (
    <DreamerOnly>
      <Dreams />
    </DreamerOnly>
  )
}

function Dreams() {
  const { t, fmtDate } = useT()
  const { settings, update } = useSettings()
  const dreams = useDreams() ?? []
  const [text, setText] = useState('')
  const [sort, setSort] = useState<'date' | 'score'>('date')
  const [open, setOpen] = useState<number | null>(null)

  const live = dreams.filter((d) => !d.dateReleased)
  const count = settings.paperMode ? settings.paperCount : live.length
  const sorted = [...dreams].sort((a, b) =>
    sort === 'score' ? (b.score ?? 0) - (a.score ?? 0) : (a.id ?? 0) - (b.id ?? 0),
  )

  const add = async () => {
    const v = text.trim()
    if (!v) return
    setText('') // clear first, so a quickly typed next dream is never wiped by a late clear
    await addDream(v)
  }
  const patch = patchDream
  // paper mode: the one chosen dream is typed here and stored as the single chosen row
  const chosenRow = dreams.find((d) => d.chosen)

  return (
    <>
      <h1>{t('dreams.title')}</h1>
      <p className="muted">{t('dreams.count', { n: count })}</p>

      {settings.paperMode ? (
        <div className="card">
          <p>{t('dreams.paper')}</p>
          <div className="field">
            <label htmlFor="pc">{t('dreams.paper.count')}</label>
            <Stepper
              id="pc"
              min={0}
              max={100}
              value={settings.paperCount}
              onChange={(v) => update({ paperCount: v })}
            />
          </div>
          <div className="field">
            <label htmlFor="paper-chosen">{t('dreams.paper.chosen')}</label>
            <AutoText
              id="paper-chosen"
              placeholder={t('dreams.paper.chosen.placeholder')}
              value={chosenRow?.text ?? ''}
              onSave={setPaperChosen}
            />
            {chosenRow && (
              <p className="small" style={{ margin: '6px 0 0' }}>
                <Link to="/dream">{t('home.chosen.open')} →</Link>
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="row">
            <input
              type="text"
              aria-label={t('dreams.add.label')}
              placeholder={t('dreams.add.placeholder')}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              style={{ flex: 1, minWidth: 200 }}
            />
            <button className="btn primary" onClick={add} disabled={!text.trim()}>
              {t('dreams.add.button')}
            </button>
          </div>
        </div>
      )}

      {extrinsicWarning(dreams) && <p className="notice small">{t('dreams.warn.extrinsic')}</p>}

      {!settings.paperMode && dreams.length === 0 && (
        <p className="muted" style={{ marginTop: 0 }}>
          {t('dreams.empty')}
        </p>
      )}
      {!settings.paperMode && dreams.length > 0 && (
        <div className="row no-print" style={{ margin: '8px 0' }}>
          <button className={`chip ${sort === 'date' ? 'on' : ''}`} onClick={() => setSort('date')}>
            {t('dreams.sort.date')}
          </button>
          <button className={`chip ${sort === 'score' ? 'on' : ''}`} onClick={() => setSort('score')}>
            {t('dreams.sort.score')}
          </button>
        </div>
      )}

      {!settings.paperMode && (
        <ul className="list">
          {sorted.map((d, i) => (
            <li key={d.id} className={`dream ${d.chosen ? 'chosen' : ''} ${d.dateAchieved ? 'achieved' : ''}`}>
              <span className="num">{i + 1}.</span>
              <div>
                <div
                  className="text"
                  onClick={() => setOpen(open === d.id ? null : d.id!)}
                  style={{ cursor: 'pointer' }}
                >
                  {d.text}
                </div>
                <div className="meta small muted">
                  {d.chosen ? (
                    <Link className="chip on" to="/dream" style={{ textDecoration: 'none' }}>
                      {t('dreams.chosen')} →
                    </Link>
                  ) : null}
                  {d.score ? <span>{d.score}/10</span> : null}
                  {d.area ? <span>{t(`area.${d.area}`)}</span> : null}
                  {d.why ? <span>{t(`dreams.tag.${d.why}`)}</span> : null}
                  {d.dateAchieved ? (
                    <span>{t('dreams.achieved.on', { date: fmtDate(d.dateAchieved) })}</span>
                  ) : (
                    <span>{t('dreams.added.on', { date: fmtDate(d.dateAdded) })}</span>
                  )}
                  {d.dateReleased ? <span>{t('dreams.released', { date: fmtDate(d.dateReleased) })}</span> : null}
                </div>
                {open === d.id && (
                  <div className="card" style={{ margin: '8px 0 0' }}>
                    <div className="field">
                      <label htmlFor={`score-${d.id}`}>{t('dreams.score')}</label>
                      <div className="row">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <button
                            key={n}
                            className={`chip ${d.score === n ? 'on' : ''}`}
                            onClick={() => patch(d, { score: d.score === n ? undefined : n })}
                            aria-pressed={d.score === n}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor={`area-${d.id}`}>{t('dreams.area')}</label>
                      <select
                        id={`area-${d.id}`}
                        value={d.area ?? ''}
                        onChange={(e) => patch(d, { area: (e.target.value || undefined) as Area | undefined })}
                      >
                        <option value="">{t('dreams.area.none')}</option>
                        {AREAS.map((a) => (
                          <option key={a} value={a}>
                            {t(`area.${a}`)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>{t('dreams.tag')}</label>
                      <div className="row">
                        {(['intrinsic', 'extrinsic'] as WhyTag[]).map((w) => (
                          <button
                            key={w}
                            className={`chip ${d.why === w ? 'on' : ''}`}
                            onClick={() => patch(d, { why: d.why === w ? undefined : w })}
                          >
                            {t(`dreams.tag.${w}`)}
                          </button>
                        ))}
                      </div>
                      <p className="small muted">{t('dreams.tag.help')}</p>
                    </div>
                    <div className="row">
                      {!d.chosen && !d.dateAchieved && !d.dateReleased && (
                        <button className="btn sm" onClick={() => chooseDream(d)}>
                          {t('dreams.choose')}
                        </button>
                      )}
                      {!d.dateAchieved ? (
                        <button className="btn sm" onClick={() => patch(d, { dateAchieved: today(), chosen: 0 })}>
                          {t('dreams.achieved.mark')}
                        </button>
                      ) : (
                        <button className="btn sm ghost" onClick={() => patch(d, { dateAchieved: undefined })}>
                          {t('dreams.achieved.unmark')}
                        </button>
                      )}
                      {!d.dateReleased && !d.dateAchieved && (
                        <button className="btn sm ghost" onClick={() => releaseDream(d)}>
                          {t('dreams.release')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <span />
            </li>
          ))}
        </ul>
      )}

      <Criteria />
    </>
  )
}

function Criteria() {
  const { t } = useT()
  const { settings } = useSettings()
  const [v, setV] = useState('')
  const add = async () => {
    const x = v.trim()
    if (!x) return
    setV('')
    await mutateSettings((cur) => ({ criteria: [...cur.criteria, x] }))
  }
  return (
    <details className="card" style={{ marginTop: 20 }}>
      <summary>{t('dreams.criteria')}</summary>
      <p className="small muted">{t('dreams.criteria.help')}</p>
      <ul className="list small">
        <li className="muted">
          ★ {t('dreams.criteria.fixed')} <span className="small">({t('dreams.criteria.fixedNote')})</span>
        </li>
        {settings.criteria.map((c, i) => (
          <li key={i} className="row" style={{ justifyContent: 'space-between' }}>
            <span>
              {i + 1}. {c}
            </span>
            <button
              className="btn sm ghost"
              aria-label={t('common.delete')}
              onClick={() => mutateSettings((cur) => ({ criteria: cur.criteria.filter((_, j) => j !== i) }))}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <input
          type="text"
          aria-label={t('dreams.criteria.add')}
          placeholder={t('dreams.criteria.placeholder')}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          style={{ flex: 1, minWidth: 160 }}
        />
        <button className="btn sm" onClick={add} disabled={!v.trim()}>
          {t('dreams.criteria.add')}
        </button>
      </div>
    </details>
  )
}
