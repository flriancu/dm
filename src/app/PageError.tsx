import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useT } from '../i18n'
import { isChunkLoadError, reloadForNewVersion } from './chunks'

/**
 * One page failed to render; the navigation stays, so every other page still works. A page
 * whose code could not be fetched stays failed until a reload (React keeps the failed
 * import), so that case reloads by itself: at once when online (at most once a minute),
 * otherwise as soon as the connection is back.
 */
export default function PageError({ error }: { error: unknown }) {
  const { t } = useT()
  const chunk = isChunkLoadError(error)
  const offline = chunk && navigator.onLine === false
  useEffect(() => {
    if (!chunk) return
    if (navigator.onLine !== false) reloadForNewVersion()
    const back = () => location.reload()
    window.addEventListener('online', back)
    return () => window.removeEventListener('online', back)
  }, [chunk])
  return (
    <div className="card" role="alert">
      <p className="notice">{t(offline ? 'page.offline' : 'page.error')}</p>
      <p className="row">
        <button className="btn primary" onClick={() => location.reload()}>
          {t('crash.reload')}
        </button>
        <Link className="btn ghost" to="/settings">
          {t('nav.settings')}
        </Link>
      </p>
    </div>
  )
}
