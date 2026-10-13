import { lazy, Suspense, type ComponentType } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LocaleProvider } from './i18n'
import { SettingsProvider, useSettings } from './state/settings'
import Shell from './components/Shell'
import ErrorBoundary from './components/ErrorBoundary'
import CrashScreen from './app/CrashScreen'
import PageError from './app/PageError'
import { retryImport } from './app/chunks'

// Route-level code splitting keeps the first load small (NFR-06); a chunk gone after a new version reloads once.
const page = <P extends object>(load: () => Promise<{ default: ComponentType<P> }>) => lazy(retryImport(load))
const Home = page(() => import('./pages/Home'))
const Onboarding = page(() => import('./pages/Onboarding'))
const Modules = page(() => import('./pages/Modules'))
const ModulePage = page(() => import('./pages/ModulePage'))
const Dreams = page(() => import('./pages/Dreams'))
const MyDream = page(() => import('./pages/MyDream'))
const Week = page(() => import('./pages/Week'))
const Calm = page(() => import('./pages/Calm'))
const Vision = page(() => import('./pages/Vision'))
const Book = page(() => import('./pages/Book'))
const Friend = page(() => import('./pages/Friend'))
const Settings = page(() => import('./pages/Settings'))
const Sources = page(() => import('./pages/Sources'))

/**
 * Onboarding comes first, and only once: before it every address leads to /start (and back
 * to the address afterwards); after it /start leads on, so a forgotten onboarding tab can
 * never write its old answers over newer settings.
 */
function Gate() {
  const { settings, loaded } = useSettings()
  const loc = useLocation()
  if (!loaded) return null
  const onStart = loc.pathname === '/start'
  if (!settings.onboarded && !onStart)
    return <Navigate to="/start" replace state={{ from: `${loc.pathname}${loc.search}` }} />
  // keyed by the location, so a second visit to /start right after onboarding redirects again
  if (settings.onboarded && onStart)
    return <Navigate key={loc.key} to={(loc.state as { from?: string } | null)?.from ?? '/'} replace />
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
