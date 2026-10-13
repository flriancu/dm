import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, type Quadrant, type WeekTask } from './db'

/** The Eisenhower week (weekTasks table, FR-13): reads through the hook, writes through these functions. */

export const useWeekTasks = () => useLiveQuery(() => db.weekTasks.toArray(), [])

export const addWeekTask = (text: string) => db.weekTasks.add({ text, created: today() })
export const putInQuadrant = (task: WeekTask, quadrant: Quadrant) => db.weekTasks.update(task.id!, { quadrant })
export const setWhen = (task: WeekTask, when: string) => db.weekTasks.update(task.id!, { when })
export const deleteWeekTask = (task: WeekTask) => db.weekTasks.delete(task.id!)

/** The one task moved to "plan" this week: unmarks the previous one in the same transaction. */
export const moveToCalendar = (task: WeekTask) =>
  db.transaction('rw', db.weekTasks, async () => {
    await db.weekTasks.where('moved').equals(1).modify({ moved: 0 })
    await db.weekTasks.update(task.id!, { quadrant: 'plan', moved: 1 })
  })
