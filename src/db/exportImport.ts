import { db, type DreamDB, type Dream, type Plan, type ModuleNote, type Setting, type FriendNote, type DreamWork } from './db'

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
}

export async function exportAll(d: DreamDB = db, includeFriend = true): Promise<ExportFile> {
  const [dreams, plans, moduleNotes, settings, friendNotes, dreamWork] = await Promise.all([
    d.dreams.toArray(), d.plans.toArray(), d.moduleNotes.toArray(), d.settings.toArray(),
    includeFriend ? d.friendNotes.toArray() : Promise.resolve(undefined),
    d.dreamWork.toArray(),
  ])
  return { app: 'dream-course', schema: 1, exportedAt: new Date().toISOString(), dreams, plans, moduleNotes, settings, friendNotes, dreamWork }
}

export function isExportFile(x: unknown): x is ExportFile {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return o.app === 'dream-course' && o.schema === 1 && Array.isArray(o.dreams) && Array.isArray(o.plans) && Array.isArray(o.settings)
}

/** Replaces everything on the device with the file's content. */
export async function importAll(file: ExportFile, d: DreamDB = db): Promise<{ dreams: number; plans: number }> {
  if (!isExportFile(file)) throw new Error('not an export file')
  await d.transaction('rw', [d.dreams, d.plans, d.moduleNotes, d.settings, d.friendNotes, d.dreamWork], async () => {
    await Promise.all([d.dreams.clear(), d.plans.clear(), d.moduleNotes.clear(), d.settings.clear(), d.friendNotes.clear(), d.dreamWork.clear()])
    await d.dreams.bulkAdd(file.dreams)
    await d.plans.bulkAdd(file.plans)
    await d.moduleNotes.bulkAdd(file.moduleNotes ?? [])
    await d.settings.bulkAdd(file.settings)
    if (file.friendNotes) await d.friendNotes.bulkAdd(file.friendNotes)
    if (file.dreamWork) await d.dreamWork.bulkAdd(file.dreamWork)
  })
  return { dreams: file.dreams.length, plans: file.plans.length }
}

export function downloadJson(name: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
