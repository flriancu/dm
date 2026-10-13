import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings, showsDreamerParts } from '../state/settings'

/** Wraps a learner page: a device in the Dream Friend role sees a pointer to its own page instead (FR-06). */
export default function DreamerOnly({ children }: { children: ReactNode }) {
  const { t } = useT()
  const { settings } = useSettings()
  if (showsDreamerParts(settings)) return <>{children}</>
  return (
    <>
      <p className="notice">{t('dreamerOnly.text')}</p>
      <p><Link className="btn" to="/friend">{t('nav.friend')} →</Link> <Link className="btn ghost" to="/settings">{t('nav.settings')}</Link></p>
    </>
  )
}
