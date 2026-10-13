import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings } from '../state/settings'
import { showsFriendSection, showsDreamerParts } from '../state/roles'

export default function Shell({ children }: { children: ReactNode }) {
  const { t } = useT()
  const { settings } = useSettings()
  const loc = useLocation()
  const onboarding = loc.pathname === '/start'
  const printing = loc.pathname.startsWith('/book/print')
  const items = [
    { to: '/', label: t('nav.home'), ico: '🏠' },
    { to: '/modules', label: t('nav.modules'), ico: '📚' },
    ...(showsDreamerParts(settings) ? [{ to: '/dreams', label: t('nav.dreams'), ico: '✨' }] : []),
    { to: '/book', label: t('nav.book'), ico: '📖' },
    ...(showsFriendSection(settings) ? [{ to: '/friend', label: t('nav.friend'), ico: '🤝' }] : []),
    { to: '/settings', label: t('nav.settings'), ico: '⚙️' },
  ]
  return (
    <div className="shell">
      {!onboarding && !printing && (
        <nav className="nav" aria-label="main">
          <Link to="/" className="brand">
            {t('app.title')}
          </Link>
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico" aria-hidden>
                {i.ico}
              </span>
              {i.label}
            </NavLink>
          ))}
        </nav>
      )}
      <main className="main">{children}</main>
    </div>
  )
}
