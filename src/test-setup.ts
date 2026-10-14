import 'fake-indexeddb/auto'

// Node has no localStorage (the unsaved-text journal uses it): a small in-memory one for tests.
if (typeof globalThis.localStorage === 'undefined') {
  const data = new Map<string, string>()
  globalThis.localStorage = {
    get length() {
      return data.size
    },
    key: (i: number) => [...data.keys()][i] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, String(v)),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear(),
  }
}
