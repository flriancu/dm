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

/** I is the table's insert type (Dexie's EntityTable makes the key optional on insert). */
export interface DocSpec<T extends object, K, I = T> {
  table: Table<T, K, I>
  key: K
  empty: () => T
  nested: readonly (keyof T)[]
}

/**
 * A patch, or a function of the stored document that returns one. Lists (values, friends,
 * the habit log) must use the function form: a list built from what the page last showed
 * would overwrite an edit saved in between (a typed name, then a quick tap on its chip).
 */
export type DocPatch<T> = Partial<T> | ((cur: T) => Partial<T>)

export async function saveDoc<T extends { updated?: string }, K, I>(spec: DocSpec<T, K, I>, patch: DocPatch<T>) {
  return db.transaction('rw', spec.table, async () => {
    const cur = (await spec.table.get(spec.key)) ?? spec.empty()
    const p = typeof patch === 'function' ? patch(cur) : patch
    // a stored document always carries its key, so it is a valid insert value as well
    await spec.table.put({ ...mergeDoc(cur, p, spec.nested), updated: today() } as unknown as I)
  })
}
