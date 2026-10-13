import { createContext, useCallback, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, DEFAULT_SETTINGS, writeSettings, type Settings, type Role, type Config } from '../db/db'

interface Ctx { settings: Settings; loaded: boolean; update: (patch: Partial<Settings>) => Promise<void> }
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

export function useSettings() { return useContext(SettingsCtx) }

/** The per-meeting switch only makes sense in a pair, where the role rotates. */
export function showsFriendSwitch(s: Settings) {
  return s.role === 'both' && s.config === 'pair'
}
export function showsFriendSection(s: Settings) {
  return s.role === 'friend' || s.role === 'both'
}
export function showsDreamerParts(s: Settings) {
  return s.role !== 'friend'
}
/**
 * Who leads the next meeting, as seen from this device: 'me' (Friend role, group leader,
 * or the pair member whose turn it is), 'other' (pair member whose turn it is not), or
 * null when the question does not arise (a Dreamer with an outside Friend).
 */
export function leadsMeetings(s: Settings): 'me' | 'other' | null {
  if (s.role === 'friend') return 'me'
  if (s.role === 'both' && s.config === 'group') return 'me'
  if (s.role === 'both' && s.config === 'pair') return s.friendToday ? 'me' : 'other'
  return null
}
/** The label of the first-meeting date depends on who is asking. */
export function startDateKey(s: { role: Role; config: Config }): string {
  if (s.config === 'group') return 'onboarding.start.group'
  if (s.role === 'friend') return 'onboarding.start.friend'
  return 'onboarding.start'
}
