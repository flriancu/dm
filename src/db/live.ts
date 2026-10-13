import { useLiveQuery } from 'dexie-react-hooks'

/**
 * A live query for one key (a dream, a module). Undefined while loading, and also while the
 * result still belongs to the previous key: useLiveQuery keeps its last result when the key
 * changes, which would show the previous dream's or module's data for a moment, and let a
 * text box start from it.
 */
export function useLiveFor<K, T>(key: K, query: (key: K) => Promise<T>): T | undefined {
  const res = useLiveQuery(async () => ({ key, value: await query(key) }), [key])
  return res && Object.is(res.key, key) ? res.value : undefined
}
