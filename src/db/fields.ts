import {
  getChosenDream,
  getDream,
  getDreamWork,
  saveDreamWork,
  setFriend,
  setHabitWeek,
  setPaperChosen,
  setRoute,
} from './dreams'
import { getVision, saveVision, setValueItem } from './vision'
import { getModuleNote, patchModuleNote } from './notes'
import { getWeekTask, setWhen } from './week'
import { setStrength } from './calm'
import { readSettings } from './settings'
import { dropUnsaved, orphanedEntries } from './journal'
import { isCourseModule } from '../content/modules'
import { isIsoDate } from '../lib/dates'
import {
  db,
  CLARIFY_STEPS,
  FRIEND_SLOTS,
  HABIT_PARTS,
  REGRET_AREAS,
  ROUTE_SLOTS,
  STRENGTH_SLOTS,
  VALUE_SLOTS,
  VISION_SECTIONS,
  WOOP_STEPS,
  type DreamFriend,
  type DreamWork,
  type VisionDoc,
} from './db'

/**
 * Every free-text field of the app, by address: what a text box saves to. An address is plain
 * data (`["route", 12, 0]`), so text not stored yet can be kept in the unsaved-text journal and
 * written later, after a reload, through the same data-module mutation. Adding a kind of text
 * field = one entry here.
 */
export interface TextField {
  /** the address: the same field always has the same key */
  key: string
  write: (text: string) => Promise<unknown>
}

type Arg = string | number
interface Kind<A extends Arg[]> {
  /** whether the address names a field that is there: replay never creates a row or a slot */
  exists: (...a: A) => Promise<boolean>
  read: (...a: A) => Promise<string | undefined>
  write: (text: string, ...a: A) => Promise<unknown>
}
const kinds = new Map<string, Kind<Arg[]>>()

function kind<A extends Arg[]>(name: string, k: Kind<A>) {
  kinds.set(name, k as unknown as Kind<Arg[]>)
  return (...a: A): TextField => ({ key: JSON.stringify([name, ...a]), write: (text) => k.write(text, ...a) })
}

type WorkGroup = 'clarify' | 'woop' | 'habit' | 'fear' | 'letgo'
type VisionGroup = 'worksheet' | 'regret' | 'yesno' | 'retro' | 'letter'
const WORK_PARTS: Record<WorkGroup, readonly string[]> = {
  clarify: CLARIFY_STEPS,
  woop: WOOP_STEPS,
  habit: HABIT_PARTS,
  fear: ['fear', 'goodEnough'],
  letgo: ['costs', 'benefits', 'replacement'],
}
const VISION_PARTS: Record<VisionGroup, readonly string[]> = {
  worksheet: VISION_SECTIONS,
  regret: REGRET_AREAS,
  yesno: ['yes', 'no', 'changes', 'hardest'],
  retro: ['tool', 'habit', 'aha', 'word'],
  letter: ['text', 'reply'],
}
const FRIEND_PARTS: readonly string[] = ['name', 'ask', 'day'] satisfies (keyof DreamFriend)[]

const part = (o: object | undefined, p: string) => (o as Record<string, unknown> | undefined)?.[p] as string | undefined
const isPart = (parts: Record<string, readonly string[]>, group: unknown, p: unknown) =>
  Object.hasOwn(parts, group as string) && parts[group as string].includes(p as string)
const isSlot = (i: unknown, n: number) => Number.isInteger(i) && (i as number) >= 0 && (i as number) < n
const dreamExists = async (id: unknown) => Number.isInteger(id) && !!(await getDream(id as number))

export const fields = {
  /** a text part of one dream's worksheets: clarify, WOOP, habit, fear, letting go */
  dreamWork: kind('dreamWork', {
    exists: async (dreamId: number, group: WorkGroup, p: string) =>
      isPart(WORK_PARTS, group, p) && (await dreamExists(dreamId)),
    read: async (dreamId, group, p) => part((await getDreamWork(dreamId))?.[group], p),
    write: (text, dreamId, group, p) => saveDreamWork(dreamId, { [group]: { [p]: text } } as Partial<DreamWork>),
  }),
  route: kind('route', {
    exists: async (dreamId: number, i: number) => isSlot(i, ROUTE_SLOTS) && (await dreamExists(dreamId)),
    read: async (dreamId, i) => (await getDreamWork(dreamId))?.routes?.[i],
    write: (text, dreamId, i) => setRoute(dreamId, i, text),
  }),
  friend: kind('friend', {
    exists: async (dreamId: number, i: number, p: keyof DreamFriend) =>
      isSlot(i, FRIEND_SLOTS) && FRIEND_PARTS.includes(p) && (await dreamExists(dreamId)),
    read: async (dreamId, i, p) => (await getDreamWork(dreamId))?.friends?.[i]?.[p],
    write: (text, dreamId, i, p) => setFriend(dreamId, i, { [p]: text }),
  }),
  habitNote: kind('habitNote', {
    exists: async (dreamId: number, week: string) => isIsoDate(week) && (await dreamExists(dreamId)),
    read: async (dreamId, week) => (await getDreamWork(dreamId))?.habitLog?.find((w) => w.week === week)?.note,
    write: (text, dreamId, week) => setHabitWeek(dreamId, week, { note: text }),
  }),
  /** paper mode: the one chosen dream, typed in */
  paperDream: kind('paperDream', {
    exists: async () => true,
    read: async () => (await getChosenDream())?.text,
    write: (text) => setPaperChosen(text),
  }),
  /** a text part of the vision document: worksheet, regret, yes/no, retrospective, the letter */
  vision: kind('vision', {
    exists: async (group: VisionGroup, p: string) => isPart(VISION_PARTS, group, p),
    read: async (group, p) => part((await getVision())?.[group], p),
    write: (text, group, p) => saveVision({ [group]: { [p]: text } } as Partial<VisionDoc>),
  }),
  value: kind('value', {
    exists: async (i: number) => isSlot(i, VALUE_SLOTS),
    read: async (i) => (await getVision())?.values[i]?.text,
    write: (text, i) => setValueItem(i, { text }),
  }),
  moduleNote: kind('moduleNote', {
    exists: async (moduleId: string, p: 'takeaways' | 'oneWord') =>
      isCourseModule(moduleId) && (p === 'takeaways' || p === 'oneWord'),
    read: async (moduleId, p) => (await getModuleNote(moduleId))?.[p],
    write: (text, moduleId, p) => patchModuleNote(moduleId, { [p]: text }),
  }),
  strength: kind('strength', {
    exists: async (i: number) => isSlot(i, STRENGTH_SLOTS),
    read: async (i) => (await readSettings()).strengths[i],
    write: (text, i) => setStrength(i, text),
  }),
  taskWhen: kind('taskWhen', {
    exists: async (taskId: number) => Number.isInteger(taskId) && !!(await getWeekTask(taskId)),
    read: async (taskId) => (await getWeekTask(taskId))?.when,
    write: (text, taskId) => setWhen(taskId, text),
  }),
}

/**
 * Writes the text the journal kept from a page that went away before its save landed (run at
 * start, before the app shows anything). An entry is written only if its field is still there
 * and still holds what it held when the edit began, or the text the page had already sent; the
 * checks and the write happen in one transaction, so another tab saving the same field cannot
 * slip in between. An entry is forgotten once written, once the field has moved on or is gone,
 * or when it names no known field; one whose write fails (storage full) stays for the next
 * start. Entries of a tab still open are left to that tab: it is still saving them.
 */
export async function replayUnsaved() {
  for (const [key, e] of await orphanedEntries()) {
    let call: { k: Kind<Arg[]>; args: Arg[] } | undefined
    try {
      const [name, ...args] = JSON.parse(key) as [string, ...Arg[]]
      const k = kinds.get(name)
      if (k) call = { k, args }
    } catch {
      // not an address this version knows
    }
    if (!call) {
      dropUnsaved(key, e.text)
      continue
    }
    const { k, args } = call
    try {
      await db.transaction('rw', db.tables, async () => {
        if (!(await k.exists(...args))) return
        const stored = (await k.read(...args)) ?? ''
        if (stored === e.base || stored === e.sent) await k.write(e.text, ...args)
      })
      dropUnsaved(key, e.text)
    } catch {
      // kept: the next start tries again
    }
  }
}
