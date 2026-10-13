import type { Table } from 'dexie'
import { db, today } from './db'

/**
 * Transactional read-modify-write for a single document with nested sub-objects
 * (dreamWork, vision). Two quick edits in different boxes never overwrite each
 * other, because each save re-reads the row inside the transaction.
 */
export function mergeDoc<T extends object>(cur: T, patch: Partial<T>, nested: readonly (keyof T)[]): T {
  const out = { ...cur, ...patch } as T
  for (const k of nested) {
    const p = patch[k]
    if (p && typeof p === 'object' && !Array.isArray(p))
      out[k] = { ...(cur[k] as object), ...(p as object) } as T[keyof T]
  }
  return out
}

export interface DocSpec<T extends object, K> {
  table: Table<T, K>
  key: K
  empty: () => T
  nested: readonly (keyof T)[]
}

export function saveDoc<T extends { updated?: string }, K>(spec: DocSpec<T, K>, patch: Partial<T>) {
  return db.transaction('rw', spec.table, async () => {
    const cur = (await spec.table.get(spec.key)) ?? spec.empty()
    await spec.table.put({ ...mergeDoc(cur, patch, spec.nested), updated: today() })
  })
}
