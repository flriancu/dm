import { useLiveQuery } from 'dexie-react-hooks'
import {
  db,
  today,
  FRIEND_SLOTS,
  MAX_CRITERIA,
  MAX_HABIT_WEEKS,
  ROUTE_SLOTS,
  type Dream,
  type DreamFriend,
  type DreamWork,
  type HabitWeek,
  type LetgoSign,
} from './db'
import { saveDoc, type DocPatch } from './docs'
import { useLiveFor } from './live'
import { mutateSettings } from './settings'

/** The dream list and the chosen dream's worksheets (dreamWork): pages read through these hooks and write through these functions. */

// ---- reads
export const useDreams = () => useLiveQuery(() => db.dreams.toArray(), [])

/** One-off reads, for code outside React (the unsaved-text replay). */
export const getChosenDream = async () => (await db.dreams.where('chosen').equals(1).first()) ?? null
export const getDreamWork = async (dreamId: number) => (await db.dreamWork.get(dreamId)) ?? null
export const getDream = async (id: number) => (await db.dreams.get(id)) ?? null

/** The dream the learner works on (chosen on the Dreams page): undefined while loading, null when there is none. */
export const useChosenDream = () => useLiveQuery(getChosenDream, [])

/** One dream by id: undefined while loading, null when there is no such dream. */
export const useDream = (id?: number | null) =>
  useLiveFor(id ?? null, async (k) => (k == null ? null : ((await db.dreams.get(k)) ?? null)))

/** The worksheets row of one dream: undefined while loading, null when none was written yet (or without a dream). */
export const useWorkOf = (dreamId?: number | null) =>
  useLiveFor(dreamId ?? null, async (k) => (k == null ? null : ((await db.dreamWork.get(k)) ?? null)))

/** A dream (the chosen one when no id is given) and its worksheets: for the printed sheets. */
export function useDreamWork(id?: number | null) {
  const chosen = useChosenDream()
  const byId = useDream(id)
  const dream = (id == null ? chosen : byId) ?? undefined
  const work = useWorkOf(dream?.id)
  return { dream, work }
}

// ---- the dream list
export const addDream = async (text: string) => db.dreams.add({ text, dateAdded: today(), chosen: 0 })
export const patchDream = async (d: Dream, p: Partial<Dream>) => db.dreams.update(d.id!, p)
export const releaseDream = async (d: Dream) => patchDream(d, { dateReleased: today(), chosen: 0 })
export const markAchieved = async (d: Dream) => patchDream(d, { dateAchieved: today(), chosen: 0 })

/**
 * Makes this the one chosen dream: unchooses the others in the same transaction. Re-reads
 * the dream first, so a dream released or achieved in another tab a moment ago is not chosen.
 */
export const chooseDream = async (d: Dream) =>
  db.transaction('rw', db.dreams, async () => {
    const cur = await db.dreams.get(d.id!)
    if (!cur || cur.dateReleased || cur.dateAchieved) return
    await db.dreams.where('chosen').equals(1).modify({ chosen: 0 })
    await db.dreams.update(d.id!, { chosen: 1 })
  })

/**
 * Paper mode: the one chosen dream is typed in a single box. Editing the text corrects the
 * chosen dream; emptying the box un-chooses it (its text and worksheets stay), so typing a
 * different dream afterwards adds a new one instead of renaming the old. Stored as typed:
 * trimming while the box is in use would eat the space before the next word.
 */
export const setPaperChosen = async (text: string) =>
  db.transaction('rw', db.dreams, async () => {
    const cur = await db.dreams.where('chosen').equals(1).first()
    if (!text.trim()) {
      if (cur) await db.dreams.update(cur.id!, { chosen: 0 })
    } else if (cur) await db.dreams.update(cur.id!, { text })
    else await db.dreams.add({ text, dateAdded: today(), chosen: 1 })
  })

// ---- the learner's own importance criteria (settings-backed, FR-11)
export const addCriterion = async (text: string) =>
  mutateSettings((cur) => (cur.criteria.length < MAX_CRITERIA ? { criteria: [...cur.criteria, text.trim()] } : {}))
/** Removes the criterion shown at `i`, found by its text: a list changed meanwhile (another tab, a quick second tap) never loses a different one. */
export const removeCriterion = async (i: number, text: string) =>
  mutateSettings((cur) => {
    const j = cur.criteria[i] === text ? i : cur.criteria.indexOf(text)
    return j < 0 ? {} : { criteria: cur.criteria.filter((_, k) => k !== j) }
  })

// ---- the worksheets of one dream
/** Read-modify-write of the worksheets inside one transaction, so two quick edits never overwrite each other. */
export const saveDreamWork = async (dreamId: number, patch: DocPatch<DreamWork>) =>
  saveDoc(
    {
      table: db.dreamWork,
      key: dreamId,
      empty: (): DreamWork => ({ dreamId, updated: today() }),
      nested: ['clarify', 'woop', 'habit', 'fear', 'letgo'],
    },
    patch,
  )

/** Sets one slot of a fixed-length list, from the stored list (never from what the page last showed). */
function setSlot<T>(list: readonly T[] | undefined, n: number, i: number, empty: () => T, fn: (cur: T) => T): T[] {
  const out = Array.from({ length: n }, (_, j) => list?.[j] ?? empty())
  out[i] = fn(out[i])
  return out
}

export const setRoute = async (dreamId: number, i: number, text: string) =>
  saveDreamWork(dreamId, (w) => ({
    routes: setSlot(
      w.routes,
      ROUTE_SLOTS,
      i,
      () => '',
      () => text,
    ),
  }))

export const setFriend = async (dreamId: number, i: number, p: Partial<DreamFriend>) =>
  saveDreamWork(dreamId, (w) => ({
    friends: setSlot(
      w.friends,
      FRIEND_SLOTS,
      i,
      () => ({}),
      (f) => ({ ...f, ...p }),
    ),
  }))

/** One week of the habit log (week = Monday ISO date), merged into the stored week. */
export const setHabitWeek = async (dreamId: number, week: string, p: Partial<HabitWeek>) =>
  saveDreamWork(dreamId, (w) => {
    const log = [...(w.habitLog ?? [])]
    const i = log.findIndex((x) => x.week === week)
    if (i < 0) log.push({ week, ...p })
    else log[i] = { ...log[i], ...p }
    return {
      habitLog:
        log.length > MAX_HABIT_WEEKS ? log.sort((a, b) => a.week.localeCompare(b.week)).slice(-MAX_HABIT_WEEKS) : log,
    }
  })

export const setLetgoSign = async (dreamId: number, sign: LetgoSign, on: boolean) =>
  saveDreamWork(dreamId, (w) => {
    const cur = w.letgo?.signs ?? []
    return { letgo: { signs: on ? [...cur.filter((s) => s !== sign), sign] : cur.filter((s) => s !== sign) } }
  })

/** The letting-go decision (FR-46): "continue" is noted; "release" also releases the dream, in one transaction. */
export const decideLetgo = async (dream: Dream, decision: 'continue' | 'release') =>
  db.transaction('rw', db.dreams, db.dreamWork, async () => {
    await saveDreamWork(dream.id!, { letgo: { decision, decided: today() } })
    if (decision === 'release') await releaseDream(dream)
  })
