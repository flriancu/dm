import { useState } from 'react'
import { LocaleProvider, UI_LOCALES, useT, type UiLocale } from '../i18n'
import { exportAll, downloadJson } from '../db/exportImport'
import { wipeAll, StorageUnavailableError, OutdatedAppError } from '../db/lifecycle'
import { today } from '../lib/dates'

/** Errors that mean the browser gives the app no storage at all (private window, blocked site data). */
const STORAGE_ERRORS = new Set([
  'OpenFailedError',
  'MissingAPIError',
  'InvalidStateError',
  'InvalidAccessError',
  'SecurityError',
  'UnknownError',
])
const isStorageError = (e: unknown) =>
  e instanceof StorageUnavailableError || STORAGE_ERRORS.has(String((e as { name?: string })?.name))

/**
 * The last resort when the app itself cannot render. Depends on nothing that can be broken
 * by stored data: the language comes from the page (set while the app last ran), and the
 * buttons talk to the database directly, so a learner can always save a copy and start over.
 */
export default function CrashScreen({ error }: { error: unknown }) {
  const lang = document.documentElement.lang
  const locale: UiLocale = (UI_LOCALES as readonly string[]).includes(lang) ? (lang as UiLocale) : 'ro'
  return (
    <LocaleProvider locale={locale}>
      <Crash kind={error instanceof OutdatedAppError ? 'outdated' : isStorageError(error) ? 'storage' : 'app'} />
    </LocaleProvider>
  )
}

function Crash({ kind }: { kind: 'app' | 'storage' | 'outdated' }) {
  // a copy and a wipe need the database: not offered without storage, nor to code older than the data
  const canUseData = kind === 'app'
  const { t } = useT()
  const [saveFailed, setSaveFailed] = useState(false)
  const save = async () => {
    try {
      downloadJson(`cartea-visurilor-${today()}.json`, await exportAll())
      setSaveFailed(false)
    } catch {
      setSaveFailed(true)
    }
  }
  const wipe = async () => {
    if (confirm(t('settings.danger.confirm'))) await wipeAll(() => alert(t('settings.danger.blocked')))
  }
  return (
    <main className="main" role="alert">
      <h1>{t('app.title')}</h1>
      <p className="notice">{t(`crash.${kind}`)}</p>
      <p className="row">
        <button className="btn primary" onClick={() => location.reload()}>
          {t('crash.reload')}
        </button>
        {canUseData && (
          <button className="btn" onClick={save}>
            {t('settings.export')}
          </button>
        )}
      </p>
      {saveFailed && <p className="notice small">{t('crash.saveFailed')}</p>}
      {canUseData && (
        <>
          <p className="small muted">{t('crash.wipe.help')}</p>
          <button className="btn ghost small" onClick={wipe}>
            {t('settings.danger')}
          </button>
        </>
      )}
    </main>
  )
}
