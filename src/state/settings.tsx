import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type Settings } from '../db/db'
import { useStoredSettings, writeSettings } from '../db/settings'

interface Ctx {
  settings: Settings
  loaded: boolean
  update: (patch: Partial<Settings>) => Promise<void>
}
const SettingsCtx = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, update: async () => {} })

export function SettingsProvider({ children }: { children: ReactNode }) {
  const stored = useStoredSettings()
  const settings = stored ?? DEFAULT_SETTINGS
  const update = useCallback((patch: Partial<Settings>) => writeSettings(patch), [])

  useEffect(() => {
    const root = document.documentElement
    if (settings.theme === 'system') delete root.dataset.theme
    else root.dataset.theme = settings.theme
    root.lang = settings.uiLocale
  }, [settings.theme, settings.uiLocale])

  const value = useMemo(() => ({ settings, loaded: stored !== undefined, update }), [settings, stored, update])
  return <SettingsCtx.Provider value={value}>{children}</SettingsCtx.Provider>
}

export function useSettings() {
  return useContext(SettingsCtx)
}
