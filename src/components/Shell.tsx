import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useT } from '../i18n'
import { useSettings, showsFriendSection } from '../state/settings'

export default function Shell({ children }: { children: ReactNode }) {
  const { t } = useT()
  const { settings } = useSettings()
  const loc = useLocation()
  const onboarding = loc.pathname === '/start'
  const printing = loc.pathname.startsWith('/book/print')
  const items = [
    { to: '/', label: t('nav.home'), ico: '⌂' },
    { to: '/modules', label: t('nav.modules'), ico: '▤' },
    { to: '/dreams', label: t('nav.dreams'), ico: '✦' },
    { to: '/book', label: t('nav.book'), ico: '▣' },
    ...(showsFriendSection(settings) ? [{ to: '/friend', label: t('nav.friend'), ico: '☺' }] : []),
    { to: '/settings', label: t('nav.settings'), ico: '⚙' },
  ]
  return (
    <div className="shell">
      <header className="topbar">
        <Link to="/" className="brand">{t('app.title')}</Link>
        {settings.role === 'both' && settings.config === 'pair' && settings.friendToday && <span className="chip on small">{t('home.friendMode')}</span>}
      </header>
      {!onboarding && !printing && (
        <nav className="nav" aria-label="main">
          {items.map((i) => (
            <NavLink key={i.to} to={i.to} end={i.to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
              <span className="ico" aria-hidden>{i.ico}</span>{i.label}
            </NavLink>
          ))}
        </nav>
      )}
      <main className="main">{children}</main>
    </div>
  )
}
