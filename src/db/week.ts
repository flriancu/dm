import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, type Quadrant, type WeekTask } from './db'

/** The Eisenhower week (weekTasks table, FR-13): reads through the hook, writes through these functions. */

export const useWeekTasks = () => useLiveQuery(() => db.weekTasks.toArray(), [])

export const addWeekTask = async (text: string) => db.weekTasks.add({ text, created: today(), moved: 0 })
/** Only a task in "plan" can be the one moved to the calendar: moving it out of "plan" unmarks it. */
export const putInQuadrant = async (task: WeekTask, quadrant: Quadrant) =>
  db.weekTasks.update(task.id!, quadrant === 'plan' ? { quadrant } : { quadrant, moved: 0 })
export const setWhen = async (task: WeekTask, when: string) => db.weekTasks.update(task.id!, { when })
export const deleteWeekTask = async (task: WeekTask) => db.weekTasks.delete(task.id!)

/** The one task moved to "plan" this week: unmarks the previous one in the same transaction (unless this task is gone). */
export const moveToCalendar = async (task: WeekTask) =>
  db.transaction('rw', db.weekTasks, async () => {
    if (!(await db.weekTasks.get(task.id!))) return
    await db.weekTasks.where('moved').equals(1).modify({ moved: 0 })
    await db.weekTasks.update(task.id!, { quadrant: 'plan', moved: 1 })
  })
