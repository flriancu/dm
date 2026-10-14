import { useLiveQuery } from 'dexie-react-hooks'
import { addMonths } from '../lib/dates'
import { letterState, nextCheckinAfterRhythm } from '../lib/course'
import {
  db,
  today,
  MAX_CHECKIN_LOG,
  MAX_CHOSEN_VALUES,
  MAX_PAST_LETTERS,
  MAX_VALUE_ACTS,
  TEXT_LONG,
  VALUE_SLOTS,
  type ValueItem,
  type VisionDoc,
} from './db'
import { saveDoc, type DocPatch } from './docs'
import { text } from '../lib/validate'

/** A merged note kept within the paragraph limit, never splitting a character in two. */
const cut = (s: string) => text(TEXT_LONG)(s) ?? ''

/** The single vision document (modules 6–7): values, letter, worksheet, regret, yes/no, check-in, retrospective. */
export function emptyVision(): VisionDoc {
  return {
    id: 'me',
    values: Array.from({ length: VALUE_SLOTS }, () => ({ text: '' })),
    valueActs: [],
    worksheet: {},
    updated: today(),
  }
}

const VISION_DOC = {
  table: db.vision,
  key: 'me' as const,
  empty: emptyVision,
  nested: ['worksheet', 'letter', 'regret', 'yesno', 'checkin', 'retro'] as const,
}

/** The stored document: undefined while loading, null before anything was written. */
export const getVision = async () => (await db.vision.get('me')) ?? null
export const useVision = () => useLiveQuery(getVision, [])

/** Transactional merge: nested objects are merged one level deep, arrays replaced. */
export const saveVision = async (patch: DocPatch<VisionDoc>) => saveDoc(VISION_DOC, patch)

// ---- values (module 6)
/** Edits one value row; choosing a sixth value is refused here, whatever the page showed. */
export const setValueItem = async (i: number, p: Partial<ValueItem>) =>
  saveVision((v) => {
    const values = Array.from({ length: VALUE_SLOTS }, (_, j) => ({ ...(v.values[j] ?? { text: '' }) }))
    const next = { ...values[i], ...p }
    if (next.chosen && !values[i].chosen && values.filter((x) => x.chosen).length >= MAX_CHOSEN_VALUES) return {}
    if (!next.chosen) next.nonNegotiable = false
    values[i] = next
    return { values }
  })

export const addValueAct = async (value: string, text: string) =>
  saveVision((v) => ({
    valueActs: [...v.valueActs, { date: today(), value, text: text.trim() }].slice(-MAX_VALUE_ACTS),
  }))

// ---- the letter from the future self (module 6)
export const sealLetter = async (deliverDate: string) =>
  saveVision({ letter: { sealed: true, deliverDate, sealedOn: today(), opened: false } })

/** Marks the letter read: on its delivery date, or early when the learner chooses to. */
export const openLetter = async () =>
  saveVision((v) => (v.letter?.opened ? {} : { letter: { opened: true, openedOn: today() } }))

/**
 * Keeps the letter already read in `pastLetters` (newest first) and starts an empty one. Only a
 * read letter moves: a letter sealed meanwhile in another tab stays sealed where it is.
 */
export const startNewLetter = async () =>
  // `letter: undefined` replaces the nested object; an empty object would be merged into the old letter
  saveVision((v) =>
    v.letter && letterState(v.letter, today()) === 'read'
      ? { pastLetters: [v.letter, ...(v.pastLetters ?? [])].slice(0, MAX_PAST_LETTERS), letter: undefined }
      : {},
  )

// ---- the check-in (FR-45)
export const setCheckinRhythm = async (months: 3 | 6) =>
  saveVision((v) => ({
    checkin: { everyMonths: months, next: nextCheckinAfterRhythm(v.checkin ?? {}, months, today()) },
  }))

/** One check-in per day: a second one the same day (a double click, another tab) adds its note to the first. */
export const logCheckin = async (note: string) =>
  saveVision((v) => {
    const c = v.checkin ?? {}
    const now = today()
    const log = [...(c.log ?? [])]
    const last = log.at(-1)
    const merged = last?.date === now ? cut([last.note, note.trim()].filter(Boolean).join('\n')) : null
    if (merged !== null) log[log.length - 1] = { date: now, note: merged }
    else log.push({ date: now, note: note.trim() })
    return { checkin: { log: log.slice(-MAX_CHECKIN_LOG), lastDone: now, next: addMonths(now, c.everyMonths ?? 3) } }
  })
