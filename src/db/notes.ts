import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, type ModuleNote, type Plan, type FriendNote } from './db'

/**
 * Per-module notes, if-then plans and the Dream Friend's notes: the pages read through
 * these hooks and write through these functions, never through the Dexie tables.
 */

// ---- module notes (one row per module: takeaways, one word, meeting held)
export const useModuleNotes = () => useLiveQuery(() => db.moduleNotes.toArray(), [])
export const useModuleNote = (moduleId: string) => useLiveQuery(() => db.moduleNotes.get(moduleId), [moduleId])
export const completedModuleIds = (notes: ModuleNote[]) =>
  new Set(notes.filter((n) => n.completedOn).map((n) => n.moduleId))

export function patchModuleNote(moduleId: string, patch: Partial<ModuleNote>) {
  return db.transaction('rw', db.moduleNotes, async () => {
    const cur = (await db.moduleNotes.get(moduleId)) ?? { moduleId }
    await db.moduleNotes.put({ ...cur, ...patch })
  })
}
export const markMeetingHeld = (moduleId: string) => patchModuleNote(moduleId, { completedOn: today() })

// ---- if-then plans
export const useOpenPlans = () => useLiveQuery(() => db.plans.filter((p) => !p.done).toArray(), []) ?? []
export const usePlansOf = (moduleId: string) =>
  useLiveQuery(() => db.plans.where('moduleId').equals(moduleId).toArray(), [moduleId]) ?? []
export const addPlan = (moduleId: string, condition: string, action: string) =>
  db.plans.add({ moduleId, condition: condition.trim(), action: action.trim(), created: today(), done: 0 })
export const hidePlan = (p: Plan) => db.plans.update(p.id!, { done: 1 })

// ---- Dream Friend notes
export const useFriendNotes = (moduleId: string | null) =>
  useLiveQuery(
    (): Promise<FriendNote[]> =>
      moduleId ? db.friendNotes.where('moduleId').equals(moduleId).reverse().sortBy('created') : Promise.resolve([]),
    [moduleId],
  ) ?? []
export const addFriendNote = (moduleId: string, text: string) =>
  db.friendNotes.add({ moduleId, text: text.trim(), created: today() })
