import { downloadText } from '../lib/files'
import { db, type DreamDB } from './db'
import { TABLE_NAMES, TABLE_SPECS, cleanTable, enforceInvariants, type BackupTables, type TableName } from './schema'

/** FR-50: one JSON file is the backup; import restores it. FR-61: friend notes can be exported apart. */
export interface ExportFile extends Partial<BackupTables> {
  app: 'dream-course'
  schema: 1
  exportedAt: string
  dreams: BackupTables['dreams']
  plans: BackupTables['plans']
  settings: BackupTables['settings']
}

export async function exportAll(d: DreamDB = db, includeFriend = true): Promise<ExportFile> {
  const tables = TABLE_NAMES.filter((n) => includeFriend || n !== 'friendNotes')
  const rows = await d.transaction('r', tables, () => Promise.all(tables.map((n) => d.table(n).toArray())))
  return {
    app: 'dream-course',
    schema: 1,
    exportedAt: new Date().toISOString(),
    ...(Object.fromEntries(tables.map((n, i) => [n, rows[i]])) as unknown as BackupTables),
  }
}

/** The top level of a backup: anything else is refused before a row is looked at. */
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

/** Why a file could not be imported; the page turns each reason into its own message. */
export class ImportError extends Error {
  readonly reason: 'tooLarge' | 'notBackup'
  constructor(reason: 'tooLarge' | 'notBackup') {
    super(reason)
    this.reason = reason
  }
}

/** Larger than any real backup (a full course is well under 1 MB); refused before reading. */
export const MAX_BACKUP_BYTES = 20 * 1024 * 1024

export async function readBackupFile(f: Blob): Promise<unknown> {
  if (f.size > MAX_BACKUP_BYTES) throw new ImportError('tooLarge')
  try {
    // Blob.text() drops one byte-order mark; a second one (some editors add it again) would break JSON.parse
    return JSON.parse((await f.text()).replace(/^\uFEFF/, ''))
  } catch {
    throw new ImportError('notBackup')
  }
}

/** What an import will do, shown to the learner before anything changes. */
export interface ImportPlan {
  tables: Partial<BackupTables>
  replaced: TableName[]
  /** Tables the device has but the file does not: they stay as they are. */
  kept: TableName[]
  /** Rows left out (unreadable, repeated) or corrected (a second chosen dream). */
  dropped: number
  exportedAt?: string
  incoming: { dreams: number; plans: number }
  current: { dreams: number }
}

/**
 * Checks a parsed file row by row. Tables present in the file replace the device's; the
 * dream worksheets go with the dreams (they are keyed by dream id); any other table the file
 * lacks (an older backup, or one without the Friend's notes, FR-61) is left untouched, and so
 * is any setting it lacks. A table that is present but not a list makes the file unreadable:
 * guessing what it meant could pair old worksheets with new dreams.
 */
export async function planImport(raw: unknown, d: DreamDB = db): Promise<ImportPlan> {
  if (!isExportFile(raw)) throw new ImportError('notBackup')
  const src = raw as unknown as Record<string, unknown>
  const tables: Partial<BackupTables> = {}
  let dropped = 0
  for (const name of TABLE_NAMES) {
    const value = src[name] ?? (name === 'dreamWork' ? [] : undefined)
    if (value === undefined) continue
    if (!Array.isArray(value)) throw new ImportError('notBackup')
    const r = cleanTable(name, value)
    ;(tables as Record<TableName, unknown>)[name] = r.rows
    dropped += r.dropped
  }
  dropped += enforceInvariants(tables)
  const replaced = TABLE_NAMES.filter((n) => tables[n])
  return {
    tables,
    replaced,
    kept: TABLE_NAMES.filter((n) => !tables[n]),
    dropped,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined,
    incoming: { dreams: tables.dreams?.length ?? 0, plans: tables.plans?.length ?? 0 },
    current: { dreams: await d.dreams.count() },
  }
}

/** Applies a plan in one transaction: either every table is restored, or nothing changes. */
export async function applyImport(plan: ImportPlan, d: DreamDB = db): Promise<void> {
  const names = plan.replaced
  await d.transaction(
    'rw',
    names.map((n) => d.table(n)),
    async () => {
      for (const n of names) {
        if (TABLE_SPECS[n].merge) {
          await d.table(n).bulkPut(plan.tables[n]!)
        } else {
          await d.table(n).clear()
          await d.table(n).bulkAdd(plan.tables[n]!)
        }
      }
    },
  )
}

/** Checks and restores a parsed backup in one go (tests, and callers that need no confirmation). */
export async function importAll(raw: unknown, d: DreamDB = db): Promise<ImportPlan> {
  const plan = await planImport(raw, d)
  await applyImport(plan, d)
  return plan
}

/** The backup as text, exactly as it is saved to a file. */
export const backupText = (data: unknown) => JSON.stringify(data, null, 2)

export function downloadJson(name: string, data: unknown) {
  downloadText(name, backupText(data), 'application/json')
}
