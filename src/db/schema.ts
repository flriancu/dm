import { today } from '../lib/dates'
import { UI_LOCALES } from '../i18n/locales'
import {
  bool,
  clampInt,
  fields,
  flag,
  int,
  isoDate,
  list,
  oneOf,
  orElse,
  slots,
  text,
  type Validator,
} from '../lib/validate'
import {
  AREAS,
  CLARIFY_STEPS,
  CONFIGS,
  DEFAULT_SETTINGS,
  FRIEND_ROLES,
  FRIEND_SLOTS,
  HABIT_PARTS,
  LETGO_SIGNS,
  MAX_CHECKIN_LOG,
  MAX_CHOSEN_VALUES,
  MAX_CRITERIA,
  MAX_HABIT_WEEKS,
  MAX_PAST_LETTERS,
  MAX_SABOTEURS,
  MAX_VALUE_ACTS,
  PICKABLE_SABOTEURS,
  QUADRANTS,
  REGRET_AREAS,
  ROLES,
  ROUTE_SLOTS,
  SABOTEURS,
  STRENGTH_SLOTS,
  SWLS_ITEMS,
  TEXT_LONG,
  TEXT_WORD,
  THEMES,
  VALUE_SLOTS,
  VISION_SECTIONS,
  WHEEL_AREAS,
  WHY_TAGS,
  WOOP_STEPS,
  type Dream,
  type DreamWork,
  type FriendNote,
  type JournalEntry,
  type ModuleNote,
  type Plan,
  type RepDone,
  type Settings,
  type StrengthUse,
  type ValueItem,
  type VisionDoc,
  type WeekTask,
  type WheelSnapshot,
} from './db'

/**
 * What a valid row of each table looks like. Used on every settings read and on every
 * backup import, so a file written by hand, by an older version or by a newer one can
 * never put a value in the database that a page cannot show. One entry per table: adding
 * a table means adding its spec here.
 */

// One limit for every text read from a file or an older version: the paragraph limit. The text
// boxes keep their own, tighter limits (TEXT_SHORT for one line), but an older version had none,
// so a long dream title written then must survive a backup unchanged. The one-word fields had
// their limit from the start.
const short = text(TEXT_LONG)
const long = text(TEXT_LONG)
const word = text(TEXT_WORD)
/**
 * Auto-increment keys: positive, and at most 2^52, half of the 2^53 where IndexedDB's key
 * generator stops, so the rows the app adds after an import keep valid keys and still pass
 * the check on the next import.
 */
export const MAX_ID = 2 ** 52
const id = int(1, MAX_ID)
const moduleId: Validator<string> = (x) => (typeof x === 'string' && /^\d{2}$/.test(x) ? x : undefined)
const dateOrToday = orElse(isoDate, today)
const textMap = <K extends string>(keys: readonly K[], v: Validator<string>) =>
  fields(Object.fromEntries(keys.map((k) => [k, v])) as Record<K, Validator<string>>)

// ---- settings: each key validated on its own; an invalid value falls back to the default
type SettingValidators = { [K in keyof Settings]-?: Validator<Settings[K]> }
const SETTING_VALIDATORS: SettingValidators = {
  role: oneOf(ROLES),
  config: oneOf(CONFIGS),
  uiLocale: oneOf(UI_LOCALES),
  theme: oneOf(THEMES),
  startDate: isoDate,
  cadenceDays: clampInt(7, 42),
  paperMode: bool,
  paperCount: clampInt(0, 100),
  criteria: list(short, MAX_CRITERIA),
  friendToday: bool,
  onboarded: bool,
  saboteurs: list(oneOf(PICKABLE_SABOTEURS), MAX_SABOTEURS, (s) => s),
  strengths: slots(short, STRENGTH_SLOTS, () => ''),
}
const isSettingKey = (k: unknown): k is keyof Settings => typeof k === 'string' && Object.hasOwn(SETTING_VALIDATORS, k)

/** The settings object from its stored rows: unknown keys ignored, unusable values replaced by the defaults. */
export function settingsFrom(rows: readonly { key: unknown; value: unknown }[]): Settings {
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const r of rows) {
    if (!isSettingKey(r.key)) continue
    const v = SETTING_VALIDATORS[r.key](r.value)
    if (v !== undefined) s[r.key] = v
  }
  return s as unknown as Settings
}

/** A settings row of a backup; a known key without a value means "not set" (e.g. no start date). */
const settingRow: Validator<{ key: string; value: unknown }> = (x) => {
  if (typeof x !== 'object' || x === null) return undefined
  const { key, value } = x as { key?: unknown; value?: unknown }
  if (!isSettingKey(key)) return undefined
  if (value === undefined || value === null) return { key, value: undefined }
  const v = SETTING_VALIDATORS[key](value)
  return v === undefined ? undefined : { key, value: v }
}

// ---- rows
const dream = fields(
  {
    id,
    text: short,
    area: oneOf(AREAS),
    why: oneOf(WHY_TAGS),
    score: int(1, 10),
    chosen: orElse(flag, () => 0 as const),
    dateAdded: dateOrToday,
    dateAchieved: isoDate,
    dateReleased: isoDate,
    tags: list(short, 20),
  },
  ['id', 'text'],
) as Validator<Dream>

const plan = fields(
  { id, moduleId, condition: short, action: short, created: dateOrToday, done: orElse(flag, () => 0 as const) },
  ['id', 'moduleId', 'condition', 'action'],
) as Validator<Plan>

const moduleNote = fields({ moduleId, oneWord: word, takeaways: long, completedOn: isoDate, passedLead: bool }, [
  'moduleId',
]) as Validator<ModuleNote>

const friendNote = fields({ id, moduleId, text: long, created: dateOrToday }, [
  'id',
  'moduleId',
  'text',
]) as Validator<FriendNote>

const dreamFriend = fields({ name: short, role: oneOf(FRIEND_ROLES), ask: long, day: short })
const dreamWork = fields(
  {
    dreamId: id,
    clarify: textMap(CLARIFY_STEPS, long),
    routes: slots(short, ROUTE_SLOTS, () => ''),
    woop: textMap(WOOP_STEPS, long),
    habit: textMap(HABIT_PARTS, short),
    habitLog: list(fields({ week: isoDate, done: bool, note: short }, ['week']), MAX_HABIT_WEEKS, (w) => w.week),
    friends: slots(dreamFriend, FRIEND_SLOTS, () => ({})),
    fear: fields({ fear: long, goodEnough: long }),
    letgo: fields({
      signs: list(oneOf(LETGO_SIGNS), LETGO_SIGNS.length, (s) => s),
      costs: long,
      benefits: long,
      replacement: long,
      decision: oneOf(['continue', 'release'] as const),
      decided: isoDate,
    }),
    updated: dateOrToday,
  },
  ['dreamId'],
) as Validator<DreamWork>

const weekTask = fields(
  {
    id,
    text: short,
    quadrant: oneOf(QUADRANTS),
    moved: orElse(flag, () => 0 as const),
    when: short,
    created: dateOrToday,
  },
  ['id', 'text'],
) as Validator<WeekTask>

const journalEntry = fields(
  {
    id,
    date: dateOrToday,
    happened: long,
    thought: long,
    felt: long,
    did: long,
    saboteur: oneOf(SABOTEURS),
    friend: long,
  },
  ['id', 'happened'],
) as Validator<JournalEntry>

const strengthUse = fields({ id, date: dateOrToday, strength: short, text: long }, [
  'id',
  'text',
]) as Validator<StrengthUse>

const repDone = fields({ id, date: dateOrToday, seconds: int(1, 3600) }, ['id', 'seconds']) as Validator<RepDone>

/** A fixed-length list of scores, or nothing: a wheel with a missing area cannot be drawn. */
const scores =
  (n: number, min: number, max: number): Validator<number[]> =>
  (x) => {
    const v = list(int(min, max), n)(x)
    return v && v.length === n ? v : undefined
  }
const wheel = fields(
  { id, date: dateOrToday, values: scores(WHEEL_AREAS.length, 0, 10), swls: scores(SWLS_ITEMS.length, 1, 7) },
  ['id', 'values', 'swls'],
) as Validator<WheelSnapshot>

const letter = fields({
  text: long,
  reply: long,
  deliverDate: isoDate,
  sealed: bool,
  sealedOn: isoDate,
  opened: bool,
  openedOn: isoDate,
})
const valueItem = fields({ text: orElse(short, () => ''), chosen: bool, nonNegotiable: bool }) as Validator<ValueItem>
/** Ten value rows, padded, with at most five chosen (the first five kept); non-negotiable only among the chosen. */
const valueRows: Validator<ValueItem[]> = (x) => {
  const rows = slots<ValueItem>(valueItem, VALUE_SLOTS, () => ({ text: '' }))(x) ?? []
  while (rows.length < VALUE_SLOTS) rows.push({ text: '' })
  let chosen = 0
  return rows.map((r) => {
    if (!r.chosen) return { ...r, nonNegotiable: false }
    chosen++
    return chosen <= MAX_CHOSEN_VALUES ? r : { ...r, chosen: false, nonNegotiable: false }
  })
}
const vision = fields(
  {
    id: oneOf(['me'] as const),
    values: valueRows,
    valueActs: orElse(
      list(fields({ date: isoDate, value: short, text: long }, ['date', 'text']), MAX_VALUE_ACTS),
      () => [],
    ),
    letter,
    pastLetters: list(letter, MAX_PAST_LETTERS),
    worksheet: orElse(textMap(VISION_SECTIONS, long), () => ({})),
    regret: textMap(REGRET_AREAS, long),
    yesno: textMap(['yes', 'no', 'changes', 'hardest'] as const, long),
    checkin: fields({
      everyMonths: oneOf([3, 6] as const),
      next: isoDate,
      lastDone: isoDate,
      log: list(fields({ date: isoDate, note: long }, ['date']), MAX_CHECKIN_LOG),
    }),
    retro: fields({ tool: long, habit: long, aha: long, word }),
    updated: dateOrToday,
  },
  ['id'],
) as Validator<VisionDoc>

// ---- the tables of a backup
export interface BackupTables {
  dreams: Dream[]
  plans: Plan[]
  moduleNotes: ModuleNote[]
  settings: { key: string; value: unknown }[]
  friendNotes: FriendNote[]
  dreamWork: DreamWork[]
  weekTasks: WeekTask[]
  journal: JournalEntry[]
  strengthUses: StrengthUse[]
  reps: RepDone[]
  wheels: WheelSnapshot[]
  vision: VisionDoc[]
}
export type TableName = keyof BackupTables

interface TableSpec<T> {
  row: Validator<T>
  key: (r: T) => unknown
  max: number
  /** Import merges the file's rows by key instead of replacing the table (settings: a key the file lacks keeps the device's value). */
  merge?: boolean
}
const spec = <T>(row: Validator<T>, key: (r: T) => unknown, max = 5000, merge = false): TableSpec<T> => ({
  row,
  key,
  max,
  merge,
})

export const TABLE_SPECS: { [K in TableName]: TableSpec<BackupTables[K][number]> } = {
  dreams: spec(dream, (r) => r.id),
  plans: spec(plan, (r) => r.id),
  moduleNotes: spec(moduleNote, (r) => r.moduleId, 100),
  settings: spec(settingRow, (r) => r.key, 100, true),
  friendNotes: spec(friendNote, (r) => r.id),
  dreamWork: spec(dreamWork, (r) => r.dreamId),
  weekTasks: spec(weekTask, (r) => r.id),
  journal: spec(journalEntry, (r) => r.id),
  strengthUses: spec(strengthUse, (r) => r.id),
  reps: spec(repDone, (r) => r.id, 100000),
  wheels: spec(wheel, (r) => r.id),
  vision: spec(vision, (r) => r.id, 1),
}
export const TABLE_NAMES = Object.keys(TABLE_SPECS) as TableName[]

/** Cleans one table: invalid rows and repeated keys are left out and counted. */
export function cleanTable<K extends TableName>(name: K, raw: unknown[]): { rows: BackupTables[K]; dropped: number } {
  const s = TABLE_SPECS[name] as TableSpec<BackupTables[K][number]>
  const rows = list(s.row, s.max, s.key)(raw) ?? []
  return { rows: rows as BackupTables[K], dropped: raw.length - rows.length }
}

/**
 * Rules between rows that a single row cannot check: one chosen dream, and never a released
 * or achieved one; one task moved to the calendar; worksheets only for dreams that exist.
 */
export function enforceInvariants(t: Partial<BackupTables>): number {
  let fixed = 0
  if (t.dreams) {
    let chosenSeen = false
    t.dreams = t.dreams.map((d) => {
      const keep = d.chosen === 1 && !d.dateReleased && !d.dateAchieved && !chosenSeen
      if (keep) chosenSeen = true
      if (d.chosen === 1 && !keep) fixed++
      return keep || d.chosen !== 1 ? d : { ...d, chosen: 0 }
    })
  }
  if (t.weekTasks) {
    let movedSeen = false
    t.weekTasks = t.weekTasks.map((w) => {
      if (w.moved !== 1) return w
      if (!movedSeen) {
        movedSeen = true
        return w
      }
      fixed++
      return { ...w, moved: 0 }
    })
  }
  if (t.dreamWork && t.dreams) {
    const ids = new Set(t.dreams.map((d) => d.id))
    const before = t.dreamWork.length
    t.dreamWork = t.dreamWork.filter((w) => ids.has(w.dreamId))
    fixed += before - t.dreamWork.length
  }
  return fixed
}
