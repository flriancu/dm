import { Link } from 'react-router-dom'
import { useT } from '../../i18n'
import AutoText from '../../components/AutoText'
import SectionHead from '../../components/SectionHead'
import { saveDreamWork } from '../../db/dreams'
import { HABIT_PARTS, today, weekStart, type HabitPart, type HabitWeek, type Dream, type DreamWork } from '../../db/db'

/** Module 4 (P): the habit recipe (anchor, behaviour, celebration) and its weekly log (FR-22, FR-45). */
export default function Habit({ dream, work }: { dream: Dream; work?: DreamWork }) {
  const { t, fmtDate } = useT()
  const setHabit = (part: HabitPart, v: string) => saveDreamWork(dream.id!, { habit: { [part]: v } })

  // weekly log: this week plus the weeks already logged, newest first
  const thisWeek = weekStart(today())
  const logged = new Map((work?.habitLog ?? []).map((w) => [w.week, w]))
  const weeks = Array.from(new Set([thisWeek, ...logged.keys()]))
    .sort()
    .reverse()
  const setWeek = (week: string, p: Partial<HabitWeek>) => {
    const next = new Map(logged)
    next.set(week, { week, ...logged.get(week), ...p })
    saveDreamWork(dream.id!, { habitLog: Array.from(next.values()) })
  }
  const doneWeeks = (work?.habitLog ?? []).filter((w) => w.done).length

  return (
    <>
      <SectionHead
        id="habit"
        label={t('mydream.section.habit')}
        title={t('habit.title')}
        right={t('habit.weeks', { n: doneWeeks })}
      />
      <p className="muted small">{t('habit.help')}</p>
      <div className="card">
        {HABIT_PARTS.map((p) => (
          <div className="field" key={p}>
            <label htmlFor={`habit-${p}`}>
              <strong>{t(`habit.${p}`)}</strong> — {t(`habit.${p}.q`)}
            </label>
            <AutoText
              id={`habit-${p}`}
              placeholder={t(`habit.${p}.placeholder`)}
              value={work?.habit?.[p] ?? ''}
              onSave={(v) => setHabit(p, v)}
            />
          </div>
        ))}
        <p className="small">
          <em>
            {[work?.habit?.anchor, work?.habit?.behaviour, work?.habit?.celebration].filter(Boolean).join(' ') ||
              t('habit.sentence.empty')}
          </em>
        </p>
      </div>
      <h3>{t('habit.log')}</h3>
      <p className="muted small">{t('habit.log.help')}</p>
      <div className="card">
        {weeks.map((w) => {
          const row = logged.get(w)
          return (
            <div key={w} className="field">
              <label className="row" style={{ minHeight: 32 }}>
                <input
                  type="checkbox"
                  key={`${w}-${row?.done ? 1 : 0}`}
                  defaultChecked={!!row?.done}
                  onChange={(e) => setWeek(w, { done: e.target.checked })}
                />
                <span>
                  {t('habit.week.of', { date: fmtDate(w) })}
                  {w === thisWeek ? ` (${t('habit.week.this')})` : ''}: {t('habit.week.done')}
                </span>
              </label>
              <AutoText
                aria-label={t('habit.note.label', { date: fmtDate(w) })}
                placeholder={t('habit.note.placeholder')}
                value={row?.note ?? ''}
                onSave={(v) => setWeek(w, { note: v })}
              />
            </div>
          )
        })}
      </div>
      <p className="small muted">
        {t('mydream.saved')} <Link to="/book/print/habit">{t('habit.print')}</Link>
      </p>
    </>
  )
}
