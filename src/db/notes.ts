import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, type Config, type ModuleNote, type Plan, type FriendNote, type Role } from './db'
import { mutateSettings, readSettings, writeSettings } from './settings'
import { useLiveFor } from './live'
import { leaderAfterMeeting, nextMeeting } from '../lib/course'
import { showsFriendSwitch } from '../state/roles'

/**
 * Per-module notes, if-then plans and the Dream Friend's notes: the pages read through
 * these hooks and write through these functions, never through the Dexie tables.
 */

// ---- module notes (one row per module: takeaways, one word, meeting held)
export const useModuleNotes = () => useLiveQuery(() => db.moduleNotes.toArray(), [])
/** One module's note: undefined while loading, null when none was written yet. */
export const useModuleNote = (moduleId: string) => useLiveFor(moduleId, getModuleNote)
export const completedModuleIds = (notes: ModuleNote[]) =>
  new Set(notes.filter((n) => n.completedOn).map((n) => n.moduleId))

export const getModuleNote = async (moduleId: string) => (await db.moduleNotes.get(moduleId)) ?? null

export async function patchModuleNote(moduleId: string, patch: Partial<ModuleNote>) {
  return db.transaction('rw', db.moduleNotes, async () => {
    const cur = (await db.moduleNotes.get(moduleId)) ?? { moduleId }
    await db.moduleNotes.put({ ...cur, ...patch })
  })
}
/**
 * Marks the meeting held, once: the first date stays. In a peer pair, holding the meeting that
 * was next (the first of `meetingIds` not held yet) passes the lead to the other person. That is
 * decided inside the transaction, from the stored notes and settings, so a double click or a
 * mark made a moment earlier in another tab can neither pass it twice nor the wrong way; the
 * note remembers it, so unmarking passes it back.
 */
export const markMeetingHeld = async (moduleId: string, meetingIds: readonly string[]) =>
  db.transaction('rw', db.moduleNotes, db.settings, async () => {
    const cur = (await db.moduleNotes.get(moduleId)) ?? { moduleId }
    if (cur.completedOn) return
    const next = nextMeeting(meetingIds, completedModuleIds(await db.moduleNotes.toArray()))
    const passLead = next === moduleId && showsFriendSwitch(await readSettings())
    await db.moduleNotes.put({ ...cur, completedOn: today(), passedLead: passLead })
    if (passLead) await mutateSettings((s) => ({ friendToday: leaderAfterMeeting(s.friendToday) }))
  })

export const unmarkMeetingHeld = async (moduleId: string) =>
  db.transaction('rw', db.moduleNotes, db.settings, async () => {
    const cur = await db.moduleNotes.get(moduleId)
    if (!cur?.completedOn) return
    await db.moduleNotes.put({ ...cur, completedOn: undefined, passedLead: false })
    // the lead comes back only to the pair it was passed in (a change of role or configuration clears the flags)
    if (cur.passedLead && showsFriendSwitch(await readSettings()))
      await mutateSettings((s) => ({ friendToday: leaderAfterMeeting(s.friendToday) }))
  })

/**
 * A new role or configuration: the turn to lead and the record of which meetings passed it
 * belong to the old arrangement, so both are cleared in the same transaction.
 */
export const changeRoleConfig = async (role: Role, config: Config) =>
  db.transaction('rw', db.settings, db.moduleNotes, async () => {
    const cur = await readSettings()
    if (cur.role === role && cur.config === config) return
    await writeSettings({ role, config, friendToday: false })
    await db.moduleNotes.toCollection().modify((n) => {
      n.passedLead = false
    })
  })

// ---- if-then plans
export const useOpenPlans = () => useLiveQuery(() => db.plans.filter((p) => !p.done).toArray(), []) ?? []
export const usePlansOf = (moduleId: string) =>
  useLiveFor(moduleId, (k) => db.plans.where('moduleId').equals(k).toArray()) ?? []
export const addPlan = async (moduleId: string, condition: string, action: string) =>
  db.plans.add({ moduleId, condition: condition.trim(), action: action.trim(), created: today(), done: 0 })
export const hidePlan = async (p: Plan) => db.plans.update(p.id!, { done: 1 })

// ---- Dream Friend notes
export const useFriendNotes = (moduleId: string | null) =>
  useLiveFor(moduleId, (k): Promise<FriendNote[]> =>
    k ? db.friendNotes.where('moduleId').equals(k).reverse().sortBy('created') : Promise.resolve([]),
  ) ?? []
export const addFriendNote = async (moduleId: string, text: string) =>
  db.friendNotes.add({ moduleId, text: text.trim(), created: today() })
