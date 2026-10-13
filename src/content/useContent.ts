import { useEffect, useRef, useState } from 'react'
import { useT, contentLocaleFor } from '../i18n'
import { listModules, type ModuleMeta } from './loader'

/**
 * Loads course content for a page. Undefined while loading (or while the key changes, so a
 * page never shows the previous module under the new address); a failed load is thrown to
 * the page's error boundary instead of leaving the page on "…" forever.
 */
export function useContent<T>(key: string, load: () => Promise<T>): T | undefined {
  const [state, setState] = useState<{ key: string; value?: T; error?: unknown }>()
  const loader = useRef(load)
  useEffect(() => {
    loader.current = load
  })
  useEffect(() => {
    let live = true
    loader.current().then(
      (value) => live && setState({ key, value }),
      (error) => live && setState({ key, error }),
    )
    return () => {
      live = false
    }
  }, [key])
  if (state?.key !== key) return undefined
  if (state.error) throw state.error
  return state.value
}

/** The module list of the current content language, in course order. */
export function useModules(): ModuleMeta[] | undefined {
  const { locale } = useT()
  const lang = contentLocaleFor(locale)
  return useContent(`modules:${lang}`, () => listModules(lang))
}
