import Dexie, { type EntityTable } from 'dexie'

/** Local-first store (FR-52). One database, versioned schema, JSON export (FR-50). */

export type Role = 'dreamer' | 'friend' | 'both'
export type Config = 'solo' | 'pair' | 'group'
export type WhyTag = 'intrinsic' | 'extrinsic'

export const AREAS = [
  'physical', 'emotional', 'intellectual', 'spiritual', 'psychological', 'material',
  'professional', 'financial', 'creative', 'adventure', 'legacy', 'character',
] as const
export type Area = (typeof AREAS)[number]

export interface Dream {
  id?: number
  text: string
  area?: Area
  why?: WhyTag
  score?: number          // 1–10 importance (FR-11)
  chosen?: 0 | 1          // the one dream worked on (FR-12)
  dateAdded: string       // ISO date
  dateAchieved?: string
  dateReleased?: string   // "letting go" (FR-46): marked, never deleted
  tags?: string[]
}

export interface Plan {                 // if-then plans (FR-25)
  id?: number
  moduleId: string
  condition: string
  action: string
  created: string
  done?: 0 | 1
}

export interface ModuleNote {           // per-module one-word feedback and takeaways (FR-05)
  moduleId: string
  oneWord?: string
  takeaways?: string
  completedOn?: string
}

export interface Setting { key: string; value: unknown }

export interface FriendNote {           // Dream Friend's own notes (FR-61), separate table
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
export interface HabitWeek { week: string; done?: boolean; note?: string }   // week = Monday ISO date

export const FRIEND_ROLES = ['friend', 'progress', 'ask'] as const
export type FriendRole = (typeof FRIEND_ROLES)[number]
export interface DreamFriend { name?: string; role?: FriendRole; ask?: string; day?: string }

export interface DreamWork {
  dreamId: number
  clarify?: Partial<Record<ClarifyStep, string>>   // module 2 (C)
  routes?: string[]                                 // three routes (module 2)
  woop?: Partial<Record<WoopStep, string>>         // module 3 (O), FR-21
  habit?: Partial<Record<HabitPart, string>>       // module 4 (P), FR-22
  habitLog?: HabitWeek[]                           // weekly tracker (FR-22, FR-45)
  friends?: DreamFriend[]                          // module 4 (I), FR-23
  fear?: { fear?: string; goodEnough?: string }    // module 4, FR-35
  letgo?: { signs?: string[]; costs?: string; benefits?: string; replacement?: string; decision?: 'continue' | 'release'; decided?: string } // FR-46
  updated: string
}

/** Module 5 (L): saboteur vocabulary, strengths, journal, attention reps, wheel of life (FR-30..34, FR-36). */
export const SABOTEURS = ['judge', 'vigilant', 'achiever', 'controller', 'stickler', 'victim', 'rational', 'pleaser', 'restless', 'avoider'] as const
export type Saboteur = (typeof SABOTEURS)[number]
export interface JournalEntry { id?: number; date: string; happened: string; thought?: string; felt?: string; did?: string; saboteur?: Saboteur; friend?: string }
export interface StrengthUse { id?: number; date: string; strength: string; text: string }
export interface RepDone { id?: number; date: string; seconds: number }
export const WHEEL_AREAS = ['home', 'work', 'money', 'health', 'friends', 'partner', 'growth', 'fun'] as const
export const SWLS_ITEMS = ['ideal', 'conditions', 'satisfied', 'gotten', 'again'] as const
export interface WheelSnapshot { id?: number; date: string; values: number[]; swls: number[] }

/** Modules 6–7: values, the letter from the future self, the vision worksheet (FR-40..45). One row, id 'me'. */
export interface ValueItem { text: string; chosen?: boolean; nonNegotiable?: boolean }
export interface ValueAct { date: string; value: string; text: string }
export interface Letter { text?: string; reply?: string; deliverDate?: string; sealed?: boolean; sealedOn?: string; opened?: boolean }
export const VISION_SECTIONS = ['matters', 'best', 'energy', 'tenYears', 'impact', 'idealDay', 'identity', 'statement', 'focus'] as const
export type VisionSection = (typeof VISION_SECTIONS)[number]
export const REGRET_AREAS = ['impact', 'relationships', 'growth', 'courage'] as const
export type RegretArea = (typeof REGRET_AREAS)[number]
export interface Checkin { everyMonths?: 3 | 6; next?: string; lastDone?: string; log?: { date: string; note: string }[] }
export interface VisionDoc {
  id: 'me'; values: ValueItem[]; valueActs: ValueAct[]; letter?: Letter; worksheet: Partial<Record<VisionSection, string>>
  regret?: Partial<Record<RegretArea, string>>                       // module 7, FR-44
  yesno?: { yes?: string; no?: string; changes?: string; hardest?: string } // module 7, FR-44
  checkin?: Checkin                                                   // FR-45
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
  moved?: 0 | 1          // the one task moved to "plan" this week
  when?: string          // day and hour given to it
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

/** Typed settings helpers. */
export interface Settings {
  role: Role
  config: Config
  uiLocale: 'ro' | 'en'
  theme: 'system' | 'light' | 'dark'
  startDate?: string
  cadenceDays: number
  paperMode: boolean
  paperCount: number
  criteria: string[]           // learner's own importance criteria (FR-11)
  friendToday: boolean         // "today I am the Dream Friend" (FR-06)
  onboarded: boolean
  saboteurs: Saboteur[]        // top three from the official test (FR-30)
  strengths: string[]          // top five VIA strengths (FR-36)
}

export const DEFAULT_SETTINGS: Settings = {
  role: 'dreamer', config: 'solo', uiLocale: 'ro', theme: 'system',
  cadenceDays: 14, paperMode: false, paperCount: 0, criteria: [], friendToday: false, onboarded: false,
  saboteurs: [], strengths: [],
}

export async function readSettings(d: DreamDB = db): Promise<Settings> {
  const rows = await d.settings.toArray()
  const s: Record<string, unknown> = { ...DEFAULT_SETTINGS }
  for (const r of rows) s[r.key] = r.value
  return s as unknown as Settings
}

export async function writeSettings(patch: Partial<Settings>, d: DreamDB = db) {
  await d.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}

/** Read-modify-write of settings inside one transaction, so two quick taps never overwrite each other. */
export async function mutateSettings(fn: (cur: Settings) => Partial<Settings>, d: DreamDB = db) {
  await d.transaction('rw', d.settings, async () => {
    const cur = await readSettings(d)
    await writeSettings(fn(cur), d)
  })
}
