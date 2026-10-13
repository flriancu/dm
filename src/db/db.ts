import Dexie, { type EntityTable } from 'dexie'
import type { UiLocale } from '../i18n/locales'

/** Local-first store (FR-52). One database, versioned schema, JSON export (FR-50). */

export const ROLES = ['dreamer', 'friend', 'both'] as const
export type Role = (typeof ROLES)[number]
/** The three meeting configurations, in the order the plans list them. */
export const CONFIGS = ['solo', 'pair', 'group'] as const
export type Config = (typeof CONFIGS)[number]
export const THEMES = ['system', 'light', 'dark'] as const
export type Theme = (typeof THEMES)[number]
export const WHY_TAGS = ['intrinsic', 'extrinsic'] as const
export type WhyTag = (typeof WHY_TAGS)[number]

/**
 * Length limits shared by the text boxes and the backup check, so whatever a box accepts
 * survives an export and import unchanged. Short: one line (a dream, a name, a route).
 * Long: a paragraph or a letter. Word: the one-word feedback.
 */
export const TEXT_SHORT = 1000
export const TEXT_LONG = 50000
export const TEXT_WORD = 40
/**
 * How long the growing lists may get (far beyond a course's use); the write functions keep
 * to them, so whatever the app stores also passes the backup check.
 */
export const MAX_CRITERIA = 20
export const MAX_VALUE_ACTS = 5000
export const MAX_CHECKIN_LOG = 500
export const MAX_HABIT_WEEKS = 2600
export const MAX_PAST_LETTERS = 100

export const AREAS = [
  'physical',
  'emotional',
  'intellectual',
  'spiritual',
  'psychological',
  'material',
  'professional',
  'financial',
  'creative',
  'adventure',
  'legacy',
  'character',
] as const
export type Area = (typeof AREAS)[number]

export interface Dream {
  id?: number
  text: string
  area?: Area
  why?: WhyTag
  score?: number // 1–10 importance (FR-11)
  chosen?: 0 | 1 // the one dream worked on (FR-12)
  dateAdded: string // ISO date
  dateAchieved?: string
  dateReleased?: string // "letting go" (FR-46): marked, never deleted
  tags?: string[]
}

export interface Plan {
  // if-then plans (FR-25)
  id?: number
  moduleId: string
  condition: string
  action: string
  created: string
  done?: 0 | 1
}

export interface ModuleNote {
  // per-module one-word feedback and takeaways (FR-05)
  moduleId: string
  oneWord?: string
  takeaways?: string
  completedOn?: string
  passedLead?: boolean // marking this meeting held passed the pair lead on, so unmarking passes it back
}

export interface Setting {
  key: string
  value: unknown
}

export interface FriendNote {
  // Dream Friend's own notes (FR-61), separate table
  id?: number
  moduleId: string
  text: string
  created: string
}

/** The chosen dream's worksheets, one row per dream (FR-20..23, later FR-21/22/23). */
export const CLARIFY_STEPS = ['clarity', 'imagine', 'feel', 'anchor', 'act'] as const
export type ClarifyStep = (typeof CLARIFY_STEPS)[number]

export const WOOP_STEPS = ['wish', 'outcome', 'obstacle', 'plan'] as const
export type WoopStep = (typeof WOOP_STEPS)[number]

export const HABIT_PARTS = ['anchor', 'behaviour', 'celebration'] as const
export type HabitPart = (typeof HABIT_PARTS)[number]
export interface HabitWeek {
  week: string
  done?: boolean
  note?: string
} // week = Monday ISO date

/** The three people around the dream (module 4); the worksheet has exactly this many rows. */
export const FRIEND_SLOTS = 3
/** The three routes to the dream (module 2). */
export const ROUTE_SLOTS = 3
export const FRIEND_ROLES = ['friend', 'progress', 'ask'] as const
export type FriendRole = (typeof FRIEND_ROLES)[number]
export interface DreamFriend {
  name?: string
  role?: FriendRole
  ask?: string
  day?: string
}

/** Signs of an action crisis on the letting-go sheet (FR-46). */
export const LETGO_SIGNS = ['oscillate', 'sleep', 'stalled', 'outside'] as const
export type LetgoSign = (typeof LETGO_SIGNS)[number]

export interface DreamWork {
  dreamId: number
  clarify?: Partial<Record<ClarifyStep, string>> // module 2 (C)
  routes?: string[] // three routes (module 2)
  woop?: Partial<Record<WoopStep, string>> // module 3 (O), FR-21
  habit?: Partial<Record<HabitPart, string>> // module 4 (P), FR-22
  habitLog?: HabitWeek[] // weekly tracker (FR-22, FR-45)
  friends?: DreamFriend[] // module 4 (I), FR-23
  fear?: { fear?: string; goodEnough?: string } // module 4, FR-35
  letgo?: {
    signs?: LetgoSign[]
    costs?: string
    benefits?: string
    replacement?: string
    decision?: 'continue' | 'release'
    decided?: string
  } // FR-46
  updated: string
}

/** Module 5 (L): saboteur vocabulary, strengths, journal, attention reps, wheel of life (FR-30..34, FR-36). */
export const SABOTEURS = [
  'judge',
  'vigilant',
  'achiever',
  'controller',
  'stickler',
  'victim',
  'rational',
  'pleaser',
  'restless',
  'avoider',
] as const
export type Saboteur = (typeof SABOTEURS)[number]
/** The Judge is everyone's; the learner picks the top three among the other nine. */
export const PICKABLE_SABOTEURS = SABOTEURS.filter((s) => s !== 'judge')
export interface JournalEntry {
  id?: number
  date: string
  happened: string
  thought?: string
  felt?: string
  did?: string
  saboteur?: Saboteur
  friend?: string
}
export interface StrengthUse {
  id?: number
  date: string
  strength: string
  text: string
}
export interface RepDone {
  id?: number
  date: string
  seconds: number
}
export const WHEEL_AREAS = ['home', 'work', 'money', 'health', 'friends', 'partner', 'growth', 'fun'] as const
export const SWLS_ITEMS = ['ideal', 'conditions', 'satisfied', 'gotten', 'again'] as const
export interface WheelSnapshot {
  id?: number
  date: string
  values: number[]
  swls: number[]
}

/** Modules 6–7: values, the letter from the future self, the vision worksheet (FR-40..45). One row, id 'me'. */
export interface ValueItem {
  text: string
  chosen?: boolean
  nonNegotiable?: boolean
}
export interface ValueAct {
  date: string
  value: string
  text: string
}
export interface Letter {
  text?: string
  reply?: string
  deliverDate?: string
  sealed?: boolean
  sealedOn?: string
  opened?: boolean // read: on or after the delivery date, or opened early on purpose
  openedOn?: string
}
/** The seven questions the letter answers, in order (keys of letter.q.* in the interface strings). */
export const LETTER_QUESTIONS = ['where', 'doing', 'feel', 'built', 'stopped', 'mattered', 'advice'] as const
/** The steps of a vision check-in (keys of checkin.step.*). */
export const CHECKIN_STEPS = ['vision', 'wheel', 'dreams', 'directions', 'yesno', 'letgo'] as const
/** The ten value rows of module 6, of which at most five are chosen. */
export const VALUE_SLOTS = 10
export const MAX_CHOSEN_VALUES = 5
export const VISION_SECTIONS = [
  'matters',
  'best',
  'energy',
  'tenYears',
  'impact',
  'idealDay',
  'identity',
  'statement',
  'focus',
] as const
export type VisionSection = (typeof VISION_SECTIONS)[number]
export const REGRET_AREAS = ['impact', 'relationships', 'growth', 'courage'] as const
export type RegretArea = (typeof REGRET_AREAS)[number]
export interface Checkin {
  everyMonths?: 3 | 6
  next?: string
  lastDone?: string
  log?: { date: string; note: string }[]
}
export interface VisionDoc {
  id: 'me'
  values: ValueItem[]
  valueActs: ValueAct[]
  letter?: Letter
  pastLetters?: Letter[] // letters already read, kept when a new one is started
  worksheet: Partial<Record<VisionSection, string>>
  regret?: Partial<Record<RegretArea, string>> // module 7, FR-44
  yesno?: { yes?: string; no?: string; changes?: string; hardest?: string } // module 7, FR-44
  checkin?: Checkin // FR-45
  retro?: { tool?: string; habit?: string; aha?: string; word?: string } // module 7 retrospective
  updated: string
}

export { weekStart } from '../lib/dates'

/** Eisenhower matrix items from a real week (FR-13), module 3. */
export const QUADRANTS = ['now', 'plan', 'delegate', 'drop'] as const
export type Quadrant = (typeof QUADRANTS)[number]
export interface WeekTask {
  id?: number
  text: string
  quadrant?: Quadrant
  moved?: 0 | 1 // the one task moved to "plan" this week
  when?: string // day and hour given to it
  created: string
}

export class DreamDB extends Dexie {
  dreams!: EntityTable<Dream, 'id'>
  plans!: EntityTable<Plan, 'id'>
  moduleNotes!: EntityTable<ModuleNote, 'moduleId'>
  settings!: EntityTable<Setting, 'key'>
  friendNotes!: EntityTable<FriendNote, 'id'>
  dreamWork!: EntityTable<DreamWork, 'dreamId'>
  weekTasks!: EntityTable<WeekTask, 'id'>
  journal!: EntityTable<JournalEntry, 'id'>
  strengthUses!: EntityTable<StrengthUse, 'id'>
  reps!: EntityTable<RepDone, 'id'>
  wheels!: EntityTable<WheelSnapshot, 'id'>
  vision!: EntityTable<VisionDoc, 'id'>

  constructor(name = 'dream-course') {
    super(name)
    this.version(1).stores({
      dreams: '++id, chosen, score, dateAdded, dateAchieved, dateReleased',
      plans: '++id, moduleId, done, created',
      moduleNotes: 'moduleId',
      settings: 'key',
      friendNotes: '++id, moduleId, created',
    })
    this.version(2).stores({
      dreamWork: 'dreamId',
    })
    this.version(3).stores({
      weekTasks: '++id, quadrant, moved, created',
    })
    this.version(4).stores({
      journal: '++id, date',
      strengthUses: '++id, date',
      reps: '++id, date',
      wheels: '++id, date',
    })
    this.version(5).stores({
      vision: 'id',
    })
  }
}

export const db = new DreamDB()

export { today } from '../lib/dates'

/** The settings rows read as one object; the reads and writes live in ./settings. */
export interface Settings {
  role: Role
  config: Config
  uiLocale: UiLocale
  theme: Theme
  startDate?: string
  cadenceDays: number
  paperMode: boolean
  paperCount: number
  criteria: string[] // learner's own importance criteria (FR-11)
  friendToday: boolean // "today I am the Dream Friend" (FR-06)
  onboarded: boolean
  saboteurs: Saboteur[] // top three from the official test (FR-30)
  strengths: string[] // top five VIA strengths (FR-36)
}

export const DEFAULT_SETTINGS: Settings = {
  role: 'dreamer',
  config: 'solo',
  uiLocale: 'ro',
  theme: 'system',
  cadenceDays: 14,
  paperMode: false,
  paperCount: 0,
  criteria: [],
  friendToday: false,
  onboarded: false,
  saboteurs: [],
  strengths: [],
}
/** At most this many saboteurs are picked from the official test (FR-30), and this many strengths (FR-36). */
export const MAX_SABOTEURS = 3
export const STRENGTH_SLOTS = 5
