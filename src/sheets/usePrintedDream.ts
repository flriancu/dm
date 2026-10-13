import { useSearchParams } from 'react-router-dom'
import { useDreamWork } from '../db/dreams'

/**
 * The dream a printed sheet is for: the one named in `?dream=` (a sheet printed from My
 * dream, possibly for a dream just released), otherwise the chosen dream.
 */
export function usePrintedDream() {
  const [params] = useSearchParams()
  const raw = params.get('dream')
  return useDreamWork(raw && /^\d+$/.test(raw) ? Number(raw) : null)
}
