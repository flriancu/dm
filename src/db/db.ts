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

export interface DreamWork {
  dreamId: number
  clarify?: Partial<Record<ClarifyStep, string>>   // module 2 (C)
  routes?: string[]                                 // three routes (module 2)
  updated: string
}

export class DreamDB extends Dexie {
  dreams!: EntityTable<Dream, 'id'>
  plans!: EntityTable<Plan, 'id'>
  moduleNotes!: EntityTable<ModuleNote, 'moduleId'>
  settings!: EntityTable<Setting, 'key'>
  friendNotes!: EntityTable<FriendNote, 'id'>
  dreamWork!: EntityTable<DreamWork, 'dreamId'>

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
  }
}

export const db = new DreamDB()

export const today = () => new Date().toISOString().slice(0, 10)

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
}

export const DEFAULT_SETTINGS: Settings = {
  role: 'dreamer', config: 'solo', uiLocale: 'ro', theme: 'system',
  cadenceDays: 14, paperMode: false, paperCount: 0, criteria: [], friendToday: false, onboarded: false,
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
