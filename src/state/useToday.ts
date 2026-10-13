import { useEffect, useState } from 'react'
import { msToNextDay, today } from '../lib/dates'

/**
 * Today's local date that changes at midnight while the page stays open, and on return to
 * a tab that slept past it (timers do not run while a phone is locked). A timer that fires
 * early (the clock was set back) simply waits again.
 */
export function useToday(): string {
  const [day, setDay] = useState(today)
  const [wait, setWait] = useState(0)
  useEffect(() => {
    const check = () => {
      const now = today()
      if (now !== day) setDay(now)
      else setWait((n) => n + 1) // same day: arm a new timer for the real midnight
    }
    const timer = window.setTimeout(check, msToNextDay() + 1000)
    const onShow = () => document.visibilityState === 'visible' && today() !== day && setDay(today())
    document.addEventListener('visibilitychange', onShow)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', onShow)
    }
  }, [day, wait])
  return day
}
