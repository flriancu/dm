import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, writeSettings, type Settings } from '../db/db'

interface Ctx {
  settings: Settings
  loaded: boolean
  update: (patch: Partial<Settings>) => Promise<void>
}
const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, update: async () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const rows = useLiveQuery(() => db.settings.toArray(), [])
  const settings = useMemo(() => {
    const s: Record<string, unknown> = { ...DEFAULT_SETTINGS }
    for (const r of rows ?? []) s[r.key] = r.value
    return s as unknown as Settings
  }, [rows])
  const update = useCallback((patch: Partial<Settings>) => writeSettings(patch), [])

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = settings.theme
    root.lang = settings.uiLocale
  }, [settings.theme, settings.uiLocale])

  const value = useMemo(() => ({ settings, loaded: rows !== undefined, update }), [settings, rows, update])
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettings() {
  return useContext(SettingsCtx)
}
