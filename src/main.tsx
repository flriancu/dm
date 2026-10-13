import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { installLifecycle } from './db/lifecycle'
import { installSaveErrorReporting } from './state/saveErrors'

// before the first query opens the database
installLifecycle()
installSaveErrorReporting()
// ask the browser not to evict the course's data under storage pressure (or, in Safari, after a week away)
void navigator.storage?.persist?.().catch(() => false)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
