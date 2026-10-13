import DreamerOnly from '../components/DreamerOnly'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useT } from '../i18n'
import { db, today, QUADRANTS, type Quadrant, type WeekTask } from '../db/db'

/** Eisenhower matrix on a real week (FR-13), module 3. Tap to assign a box; drag works too. */
export default function WeekPage() {
  return <DreamerOnly><Week /></DreamerOnly>
}

function Week() {
  const { t } = useT()
  const tasks = useLiveQuery(() => db.weekTasks.toArray(), []) ?? []
  const [text, setText] = useState('')
  const [open, setOpen] = useState<number | null>(null)

  const add = async () => {
    const v = text.trim(); if (!v) return
    setText('')
    await db.weekTasks.add({ text: v, created: today() })
  }
  const put = (task: WeekTask, quadrant: Quadrant) => db.weekTasks.update(task.id!, { quadrant })
  const move = async (task: WeekTask) => {
    await db.transaction('rw', db.weekTasks, async () => {
      await db.weekTasks.where('moved').equals(1).modify({ moved: 0 })
      await db.weekTasks.update(task.id!, { quadrant: 'plan', moved: 1 })
    })
  }
  const onDrop = (q: Quadrant) => (e: React.DragEvent) => {
    e.preventDefault()
    const id = Number(e.dataTransfer.getData('text/plain'))
    if (id) db.weekTasks.update(id, { quadrant: q })
  }
  const unsorted = tasks.filter((x) => !x.quadrant)
  const moved = tasks.find((x) => x.moved === 1)

  const Item = ({ task }: { task: WeekTask }) => (
    <div draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', String(task.id))}
      className="chip" style={{ cursor: 'grab', maxWidth: '100%', whiteSpace: 'normal', textAlign: 'left', background: task.moved ? 'var(--accent-soft)' : undefined }}
      onClick={() => setOpen(open === task.id ? null : task.id!)}>
      {task.moved ? '★ ' : ''}{task.text}
    </div>
  )

  return (
    <>
      <h1>{t('week.title')}</h1>
      <p className="muted">{t('week.intro')}</p>
      <div className="card">
        <div className="row">
          <input type="text" aria-label={t('week.add.label')} placeholder={t('week.add.placeholder')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} style={{ flex: 1, minWidth: 200 }} />
          <button className="btn primary" onClick={add} disabled={!text.trim()}>{t('week.add.button')}</button>
        </div>
      </div>
      {tasks.length === 0 && <p className="muted" style={{ marginTop: 0 }}>{t('week.empty')}</p>}

      {unsorted.length > 0 && (
        <div className="card">
          <div className="small muted">{t('week.unsorted')}</div>
          <div className="row">{unsorted.map((x) => <Item key={x.id} task={x} />)}</div>
        </div>
      )}

      <div className="matrix">
        <div className="axis-x"><span /><span>{t('week.axis.urgent')}</span><span>{t('week.axis.notUrgent')}</span></div>
        {([['important', 'now', 'plan'], ['notImportant', 'delegate', 'drop']] as const).map(([axis, a, b]) => (
          <div className="axis-row" key={axis}>
            <span className="axis-y">{t(`week.axis.${axis}`)}</span>
            {[a, b].map((q) => (
              <div key={q} className={`cell ${q}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop(q)}>
                <div className="cell-title">{t(`week.quadrant.${q}`)}</div>
                <div className="row" style={{ gap: 6 }}>{tasks.filter((x) => x.quadrant === q).map((x) => <Item key={x.id} task={x} />)}</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {open !== null && tasks.find((x) => x.id === open) && (() => {
        const task = tasks.find((x) => x.id === open)!
        return (
          <div className="card">
            <strong>{task.text}</strong>
            <div className="field">
              <label>{t('week.put')}</label>
              <div className="row">{QUADRANTS.map((q) => <button key={q} className={`chip ${task.quadrant === q ? 'on' : ''}`} onClick={() => put(task, q)}>{t(`week.quadrant.${q}`)}</button>)}</div>
            </div>
            <div className="row">
              {!task.moved && <button className="btn sm" onClick={() => move(task)}>{t('week.move')}</button>}
              <button className="btn sm ghost" onClick={() => { db.weekTasks.delete(task.id!); setOpen(null) }}>{t('week.delete')}</button>
            </div>
            {task.moved ? (
              <div className="field">
                <label htmlFor="when">{t('week.moved')} · {t('week.when')}</label>
                <input id="when" type="text" placeholder={t('week.when.placeholder')} defaultValue={task.when ?? ''} onBlur={(e) => db.weekTasks.update(task.id!, { when: e.target.value })} />
              </div>
            ) : null}
          </div>
        )
      })()}

      <h2>{t('week.reflect')}</h2>
      <div className="card">
        <ol style={{ margin: 0, paddingLeft: '1.3rem' }}>
          {[1, 2, 3, 4].map((i) => <li key={i}>{t(`week.reflect.${i}`)}{i === 4 && moved ? <strong> {moved.text}{moved.when ? ` · ${moved.when}` : ''}</strong> : null}</li>)}
        </ol>
      </div>
      <p className="small muted">{t('mydream.saved')} <Link to="/book/print/week">{t('week.print')}</Link></p>
    </>
  )
}
