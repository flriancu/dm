import { Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LocaleProvider } from './i18n'
import { SettingsProvider, useSettings } from './state/settings'
import Shell from './components/Shell'
import ErrorBoundary from './components/ErrorBoundary'
import CrashScreen from './app/CrashScreen'
import PageError from './app/PageError'
import { lazyPage } from './app/chunks'

// Route-level code splitting keeps the first load small (NFR-06); a chunk gone after a new version reloads once.
const Home = lazyPage(() => import('./pages/Home'))
const Onboarding = lazyPage(() => import('./pages/Onboarding'))
const Modules = lazyPage(() => import('./pages/Modules'))
const ModulePage = lazyPage(() => import('./pages/ModulePage'))
const Dreams = lazyPage(() => import('./pages/Dreams'))
const MyDream = lazyPage(() => import('./pages/MyDream'))
const Week = lazyPage(() => import('./pages/Week'))
const Calm = lazyPage(() => import('./pages/Calm'))
const Vision = lazyPage(() => import('./pages/Vision'))
const Book = lazyPage(() => import('./pages/Book'))
const Friend = lazyPage(() => import('./pages/Friend'))
const Settings = lazyPage(() => import('./pages/Settings'))
const Sources = lazyPage(() => import('./pages/Sources'))

/**
 * Onboarding comes first, and only once: before it every address leads to /start (and back
 * to the address afterwards); after it /start leads on, so a forgotten onboarding tab can
 * never write its old answers over newer settings.
 */
/** An address inside the app to return to, or Home: `//host` would leave the app (and the router refuses it). */
const inApp = (to: unknown) => (typeof to === 'string' && /^\/(?!\/)/.test(to) ? to : '/')

function Gate() {
  const { settings, loaded } = useSettings()
  const loc = useLocation()
  if (!loaded) return null
  const onStart = loc.pathname === '/start'
  if (!settings.onboarded && !onStart)
    return <Navigate to="/start" replace state={{ from: inApp(`${loc.pathname}${loc.search}`) }} />
  // keyed by the location, so a second visit to /start right after onboarding redirects again
  if (settings.onboarded && onStart)
    return <Navigate key={loc.key} to={inApp((loc.state as { from?: unknown } | null)?.from)} replace />
  return (
    <LocaleProvider locale={settings.uiLocale}>
      <Shell>
        <ErrorBoundary resetKey={loc.pathname} fallback={(e) => <PageError error={e} />}>
          <Suspense fallback={<p className="muted">…</p>}>
            <Routes>
              <Route path="/start" element={<Onboarding />} />
              <Route path="/" element={<Home />} />
              <Route path="/modules" element={<Modules />} />
              <Route path="/module/:id" element={<ModulePage />} />
              <Route path="/dreams" element={<Dreams />} />
              <Route path="/dream" element={<MyDream />} />
              <Route path="/week" element={<Week />} />
              <Route path="/calm" element={<Calm />} />
              <Route path="/vision" element={<Vision />} />
              <Route path="/book" element={<Book />} />
              <Route path="/book/print/:which" element={<Book print />} />
              <Route path="/friend" element={<Friend />} />
              <Route path="/friend/:id" element={<Friend />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/sources" element={<Sources />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </Shell>
    </LocaleProvider>
  )
}

export default function App() {
  return (
    <ErrorBoundary fallback={(e) => <CrashScreen error={e} />}>
      <SettingsProvider>
        <HashRouter>
          <Gate />
        </HashRouter>
      </SettingsProvider>
    </ErrorBoundary>
  )
}
