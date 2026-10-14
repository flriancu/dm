import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import CrashScreen from './app/CrashScreen'
import { installLifecycle, openStorage } from './db/lifecycle'
import { replayUnsaved } from './db/fields'
import { claimTab, replayWhenTabsClose } from './db/journal'
import { installSaveErrorReporting } from './state/saveErrors'

// before the first query opens the database
installLifecycle()
installSaveErrorReporting()
claimTab() // so a tab starting meanwhile leaves this tab's unsaved text to it
// ask the browser not to evict the course's data under storage pressure (or, in Safari, after a week away)
void navigator.storage?.persist?.().catch(() => false)

const root = createRoot(document.getElementById('root')!)
const show = (node: ReactNode) => root.render(<StrictMode>{node}</StrictMode>)

// Storage first: a database that cannot open, or one written by a newer version, is explained
// instead of showing an empty page; text a page left unsaved when it went away is written
// before anything shows it.
openStorage()
  .then(replayUnsaved)
  .then(
    () => {
      replayWhenTabsClose(replayUnsaved) // and the text of another tab that closes before its save lands
      show(<App />)
    },
    (e) => show(<CrashScreen error={e} />),
  )
