import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, MAX_SABOTEURS, STRENGTH_SLOTS, type JournalEntry, type Saboteur, type WheelSnapshot } from './db'
import { mutateSettings } from './settings'

/** Module 5 data: saboteur and strength settings, strength uses, the journal, attention reps and wheel snapshots. */

// ---- profile (settings-backed)
/** Toggles a saboteur in the top three; reads the current list inside the transaction, so two quick taps never overwrite each other. */
export const toggleSaboteur = async (s: Saboteur) =>
  mutateSettings((cur) => {
    const list = cur.saboteurs
    if (list.includes(s)) return { saboteurs: list.filter((x) => x !== s) }
    return list.length < MAX_SABOTEURS ? { saboteurs: [...list, s] } : {}
  })
export const setStrength = async (i: number, v: string) =>
  mutateSettings((cur) => {
    const n = Array.from({ length: STRENGTH_SLOTS }, (_, j) => cur.strengths[j] ?? '')
    n[i] = v
    return { strengths: n }
  })

// ---- strength uses, newest first
export const useStrengthUses = () => useLiveQuery(() => db.strengthUses.orderBy('date').reverse().toArray(), [])
export const addStrengthUse = async (strength: string, text: string) =>
  db.strengthUses.add({ date: today(), strength, text: text.trim() })

// ---- journal, newest first
export const useJournal = () => useLiveQuery(() => db.journal.orderBy('date').reverse().toArray(), [])
export const addJournalEntry = async (entry: Omit<JournalEntry, 'id' | 'date'>) =>
  db.journal.add({ ...entry, date: today() })
export const deleteJournalEntry = async (e: JournalEntry) => db.journal.delete(e.id!)

// ---- attention reps
export const useRepCount = () => useLiveQuery(() => db.reps.count(), [])
export const addRep = async (seconds: number) => db.reps.add({ date: today(), seconds })

// ---- wheel of life snapshots, newest first
export const useWheels = () => useLiveQuery(() => db.wheels.orderBy('date').reverse().toArray(), [])
export const useLastWheel = () => useLiveQuery(() => db.wheels.orderBy('date').reverse().first(), [])
/** One snapshot per day: saving again the same day (a double click, a change of mind) replaces it. */
export const saveWheel = async (values: number[], swls: number[]) =>
  db.transaction('rw', db.wheels, async () => {
    const date = today()
    const same = await db.wheels.where('date').equals(date).first()
    if (same) await db.wheels.update(same.id!, { values, swls })
    else await db.wheels.add({ date, values, swls } as WheelSnapshot)
  })
