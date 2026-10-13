import { useLiveQuery } from 'dexie-react-hooks'
import { db, today, type VisionDoc } from './db'
import { saveDoc } from './docs'

/** The single vision document (modules 6–7): values, letter, worksheet, regret, yes/no, check-in, retrospective. */
export function emptyVision(): VisionDoc {
  return {
    id: 'me',
    values: Array.from({ length: 10 }, () => ({ text: '' })),
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

/** The stored document, or undefined while loading. */
export const useVision = () => useLiveQuery(() => db.vision.get('me'), [])

/** Transactional merge: nested objects are merged one level deep, arrays replaced. */
export const saveVision = (patch: Partial<VisionDoc>) => saveDoc(VISION_DOC, patch)
