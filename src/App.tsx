import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { LocaleProvider } from './i18n'
import { SettingsProvider, useSettings } from './state/settings'
import Shell from './components/Shell'

// Route-level code splitting keeps the first load small (NFR-06).
const Home = lazy(() => import('./pages/Home'))
const Onboarding = lazy(() => import('./pages/Onboarding'))
const Modules = lazy(() => import('./pages/Modules'))
const ModulePage = lazy(() => import('./pages/ModulePage'))
const Dreams = lazy(() => import('./pages/Dreams'))
const MyDream = lazy(() => import('./pages/MyDream'))
const Week = lazy(() => import('./pages/Week'))
const Book = lazy(() => import('./pages/Book'))
const Friend = lazy(() => import('./pages/Friend'))
const Settings = lazy(() => import('./pages/Settings'))
const Sources = lazy(() => import('./pages/Sources'))

function Gate() {
  const { settings, loaded } = useSettings()
  const loc = useLocation()
  if (!loaded) return null
  if (!settings.onboarded && loc.pathname !== '/start') return <Navigate to="/start" replace />
  return (
    <LocaleProvider locale={settings.uiLocale}>
      <Shell>
        <Suspense fallback={<p className="muted">…</p>}>
          <Routes>
            <Route path="/start" element={<Onboarding />} />
            <Route path="/" element={<Home />} />
            <Route path="/modules" element={<Modules />} />
            <Route path="/module/:id" element={<ModulePage />} />
            <Route path="/dreams" element={<Dreams />} />
            <Route path="/dream" element={<MyDream />} />
            <Route path="/week" element={<Week />} />
            <Route path="/book" element={<Book />} />
            <Route path="/book/print/:which" element={<Book print />} />
            <Route path="/friend" element={<Friend />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/sources" element={<Sources />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Shell>
    </LocaleProvider>
  )
}

export default function App() {
  return (
    <SettingsProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
    </SettingsProvider>
  )
}
