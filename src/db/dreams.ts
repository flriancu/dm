import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, type Dream, type DreamWork } from './db'
import { saveDoc } from './docs'

/** The dream list and the chosen dream's worksheets (dreamWork): pages read through these hooks and write through these functions. */

// ---- reads
export const useDreams = () => useLiveQuery(() => db.dreams.toArray(), [])

/** The dream the learner works on (chosen on the Dreams page). */
export const useChosenDream = () => useLiveQuery(() => db.dreams.where('chosen').equals(1).first(), [])

/** The chosen dream, or the most recently released one (so the letting-go note stays visible); null when there is none. */
export const useChosenOrReleasedDream = () =>
  useLiveQuery(
    async () =>
      (await db.dreams.where('chosen').equals(1).first()) ??
      (await db.dreams.orderBy('dateReleased').reverse().first()) ??
      null,
    [],
  )

/** The worksheets row of one dream, or undefined while loading or without a dream. */
export const useWorkOf = (dreamId?: number) =>
  useLiveQuery(() => (dreamId ? db.dreamWork.get(dreamId) : undefined), [dreamId])

/** The chosen dream and its worksheets (clarify, WOOP, habit, friends, fear, letting go). */
export function useDreamWork() {
  const dream = useChosenDream()
  const work = useWorkOf(dream?.id)
  return { dream, work }
}

// ---- writes
export const addDream = (text: string) => db.dreams.add({ text, dateAdded: today(), chosen: 0 })
export const patchDream = (d: Dream, p: Partial<Dream>) => db.dreams.update(d.id!, p)
export const releaseDream = (d: Dream) => patchDream(d, { dateReleased: today(), chosen: 0 })

/** Makes this the one chosen dream: unchooses the others in the same transaction. */
export const chooseDream = (d: Dream) =>
  db.transaction('rw', db.dreams, async () => {
    await db.dreams.where('chosen').equals(1).modify({ chosen: 0 })
    await db.dreams.update(d.id!, { chosen: 1 })
  })

/** Paper mode: the one chosen dream is typed in, and stored as the single chosen row. */
export const setPaperChosen = (text: string) =>
  db.transaction('rw', db.dreams, async () => {
    const cur = await db.dreams.where('chosen').equals(1).first()
    if (cur) await db.dreams.update(cur.id!, { text: text.trim() })
    else if (text.trim()) await db.dreams.add({ text: text.trim(), dateAdded: today(), chosen: 1 })
  })

/** Read-modify-write of the worksheets inside one transaction, so two quick edits never overwrite each other. */
export const saveDreamWork = (dreamId: number, patch: Partial<DreamWork>) =>
  saveDoc(
    {
      table: db.dreamWork,
      key: dreamId,
      empty: () => ({ dreamId, updated: today() }),
      nested: ['clarify', 'woop', 'habit', 'fear', 'letgo'],
    },
    patch,
  )
