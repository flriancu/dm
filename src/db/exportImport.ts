import {
  db,
  type DreamDB,
  type Dream,
  type Plan,
  type ModuleNote,
  type Setting,
  type FriendNote,
  type DreamWork,
  type WeekTask,
  type JournalEntry,
  type StrengthUse,
  type RepDone,
  type WheelSnapshot,
  type VisionDoc,
} from './db'

/** FR-50: one JSON file is the backup; import restores it. FR-61: friend notes exported apart. */
export interface ExportFile {
  app: 'dream-course'
  schema: 1
  exportedAt: string
  dreams: Dream[]
  plans: Plan[]
  moduleNotes: ModuleNote[]
  settings: Setting[]
  friendNotes?: FriendNote[]
  dreamWork?: DreamWork[]
  weekTasks?: WeekTask[]
  journal?: JournalEntry[]
  strengthUses?: StrengthUse[]
  reps?: RepDone[]
  wheels?: WheelSnapshot[]
  vision?: VisionDoc[]
}

export async function exportAll(d: DreamDB = db, includeFriend = true): Promise<ExportFile> {
  const [
    dreams,
    plans,
    moduleNotes,
    settings,
    friendNotes,
    dreamWork,
    weekTasks,
    journal,
    strengthUses,
    reps,
    wheels,
    vision,
  ] = await Promise.all([
    d.dreams.toArray(),
    d.plans.toArray(),
    d.moduleNotes.toArray(),
    d.settings.toArray(),
    includeFriend ? d.friendNotes.toArray() : Promise.resolve(undefined),
    d.dreamWork.toArray(),
    d.weekTasks.toArray(),
    d.journal.toArray(),
    d.strengthUses.toArray(),
    d.reps.toArray(),
    d.wheels.toArray(),
    d.vision.toArray(),
  ])
  return {
    app: 'dream-course',
    schema: 1,
    exportedAt: new Date().toISOString(),
    dreams,
    plans,
    moduleNotes,
    settings,
    friendNotes,
    dreamWork,
    weekTasks,
    journal,
    strengthUses,
    reps,
    wheels,
    vision,
  }
}

export function isExportFile(x: unknown): x is ExportFile {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    o.app === 'dream-course' &&
    o.schema === 1 &&
    Array.isArray(o.dreams) &&
    Array.isArray(o.plans) &&
    Array.isArray(o.settings)
  )
}

/** Replaces everything on the device with the file's content. */
export async function importAll(file: ExportFile, d: DreamDB = db): Promise<{ dreams: number; plans: number }> {
  if (!isExportFile(file)) throw new Error('not an export file')
  await d.transaction(
    'rw',
    [
      d.dreams,
      d.plans,
      d.moduleNotes,
      d.settings,
      d.friendNotes,
      d.dreamWork,
      d.weekTasks,
      d.journal,
      d.strengthUses,
      d.reps,
      d.wheels,
      d.vision,
    ],
    async () => {
      await Promise.all([
        d.dreams.clear(),
        d.plans.clear(),
        d.moduleNotes.clear(),
        d.settings.clear(),
        d.friendNotes.clear(),
        d.dreamWork.clear(),
        d.weekTasks.clear(),
        d.journal.clear(),
        d.strengthUses.clear(),
        d.reps.clear(),
        d.wheels.clear(),
        d.vision.clear(),
      ])
      await d.dreams.bulkAdd(file.dreams)
      await d.plans.bulkAdd(file.plans)
      await d.moduleNotes.bulkAdd(file.moduleNotes ?? [])
      await d.settings.bulkAdd(file.settings)
      if (file.friendNotes) await d.friendNotes.bulkAdd(file.friendNotes)
      if (file.dreamWork) await d.dreamWork.bulkAdd(file.dreamWork)
      if (file.weekTasks) await d.weekTasks.bulkAdd(file.weekTasks)
      if (file.journal) await d.journal.bulkAdd(file.journal)
      if (file.strengthUses) await d.strengthUses.bulkAdd(file.strengthUses)
      if (file.reps) await d.reps.bulkAdd(file.reps)
      if (file.wheels) await d.wheels.bulkAdd(file.wheels)
      if (file.vision) await d.vision.bulkAdd(file.vision)
    },
  )
  return { dreams: file.dreams.length, plans: file.plans.length }
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
