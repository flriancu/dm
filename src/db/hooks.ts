import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

/** The dream the learner works on (chosen on the Dreams page). */
export function useChosenDream() {
  return useLiveQuery(() => db.dreams.where('chosen').equals(1).first(), [])
}

/** The chosen dream and its worksheets (clarify, WOOP, habit, friends, fear, letting go). */
export function useDreamWork() {
  const dream = useChosenDream()
  const work = useLiveQuery(() => (dream?.id ? db.dreamWork.get(dream.id) : undefined), [dream?.id])
  return { dream, work }
}
