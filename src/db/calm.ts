import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, mutateSettings, type JournalEntry, type Saboteur, type WheelSnapshot } from './db'

/** Module 5 data: saboteur and strength settings, strength uses, the journal, attention reps and wheel snapshots. */

// ---- profile (settings-backed)
/** Toggles a saboteur in the top three; reads the current list inside the transaction, so two quick taps never overwrite each other. */
export const toggleSaboteur = (s: Saboteur) =>
  mutateSettings((cur) => {
    const list = cur.saboteurs
    if (list.includes(s)) return { saboteurs: list.filter((x) => x !== s) }
    return list.length < 3 ? { saboteurs: [...list, s] } : {}
  })
export const setStrength = (i: number, v: string) =>
  mutateSettings((cur) => {
    const n = [...cur.strengths, '', '', '', '', ''].slice(0, 5)
    n[i] = v
    return { strengths: n }
  })

// ---- strength uses, newest first
export const useStrengthUses = () => useLiveQuery(() => db.strengthUses.orderBy('date').reverse().toArray(), [])
export const addStrengthUse = (strength: string, text: string) => db.strengthUses.add({ date: today(), strength, text })

// ---- journal, newest first
export const useJournal = () => useLiveQuery(() => db.journal.orderBy('date').reverse().toArray(), [])
export const addJournalEntry = (entry: Partial<JournalEntry>) =>
  db.journal.add({ ...entry, date: today() } as JournalEntry)
export const deleteJournalEntry = (e: JournalEntry) => db.journal.delete(e.id!)

// ---- attention reps
export const useRepCount = () => useLiveQuery(() => db.reps.count(), [])
export const addRep = (seconds: number) => db.reps.add({ date: today(), seconds })

// ---- wheel of life snapshots, newest first
export const useWheels = () => useLiveQuery(() => db.wheels.orderBy('date').reverse().toArray(), [])
export const useLastWheel = () => useLiveQuery(() => db.wheels.orderBy('date').reverse().first(), [])
export const saveWheel = (values: number[], swls: number[]) =>
  db.wheels.add({ date: today(), values, swls } as WheelSnapshot)
