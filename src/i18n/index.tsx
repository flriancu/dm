import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import { parseLocal } from '../lib/dates'
import ro from './locales/ro.json'
import en from './locales/en.json'

/**
 * Interface strings only (FR-03). Course content lives in /content/<lang>/ and is
 * loaded separately. Adding an interface language = add a JSON file here and list it
 * in UI_LOCALES. Components never branch on the language value.
 */
export const UI_LOCALES = ['ro', 'en'] as const
export type UiLocale = (typeof UI_LOCALES)[number]

/** Content languages shipped. v1: Romanian only (D4). */
export const CONTENT_LOCALES = ['ro'] as const
export type ContentLocale = (typeof CONTENT_LOCALES)[number]
export const DEFAULT_CONTENT_LOCALE: ContentLocale = 'ro'

type Dict = Record<string, string>
const dicts: Record<UiLocale, Dict> = { ro, en }

/** Per-locale layout facts. A new locale sets these; layout code reads them. */
export const LOCALE_META: Record<UiLocale, { dir: 'ltr' | 'rtl'; name: string }> = {
  ro: { dir: 'ltr', name: 'Română' },
  en: { dir: 'ltr', name: 'English' },
}

export function contentLocaleFor(ui: UiLocale): ContentLocale {
  return (CONTENT_LOCALES as readonly string[]).includes(ui) ? (ui as ContentLocale) : DEFAULT_CONTENT_LOCALE
}

export type T = (key: string, vars?: Record<string, string | number>) => string

function translate(locale: UiLocale, key: string, vars?: Record<string, string | number>): string {
  const raw = dicts[locale][key] ?? dicts.ro[key] ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

interface Ctx {
  locale: UiLocale
  t: T
  fmtDate: (d: string | Date) => string
}
function formatDate(locale: UiLocale, d: string | Date): string {
  const date = typeof d === 'string' ? (d.length === 10 ? parseLocal(d) : new Date(d)) : d
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date)
}
// Default value is only reached without a provider (e.g. after a hot reload recreates the context); keep it correct anyway.
const LocaleCtx = createContext<Ctx>({
  locale: 'ro',
  t: (k, v) => translate('ro', k, v),
  fmtDate: (d) => formatDate('ro', d),
})

export function LocaleProvider({ locale, children }: { locale: UiLocale; children: ReactNode }) {
  const t = useCallback<T>((k, v) => translate(locale, k, v), [locale])
  const fmtDate = useCallback((d: string | Date) => formatDate(locale, d), [locale])
  const value = useMemo(() => ({ locale, t, fmtDate }), [locale, t, fmtDate])
  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>
}

export function useT() {
  return useContext(LocaleCtx)
}
