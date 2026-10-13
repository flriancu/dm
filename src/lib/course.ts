import { addDays, parseLocal } from './dates'

/** Course calendar and progress rules, free of React and of the database. */

export interface ModuleRef {
  id: string
  order: number
}

/** Meeting date of a module: module 1 is on the start date, each later one `cadence` days after the previous. Module 0 has no meeting. */
export function moduleDate(start: string | undefined, cadence: number, order: number): Date | null {
  if (!start || order < 1) return null
  return parseLocal(addDays(start, cadence * (order - 1)))
}

/** The next thing to do: module 0 until it is marked read, then the first module whose meeting has not taken place. */
export function nextModule<M extends ModuleRef>(modules: M[], done: Set<string>): M | undefined {
  return modules.find((m) => !done.has(m.id))
}

/** In a peer pair the two take turns leading. Given who leads the next meeting, says who leads the one after. */
export function leaderAfterMeeting(iLeadNow: boolean): boolean {
  return !iLeadNow
}

/** Whether the sealed letter should be surfaced on Home: sealed, delivery date reached, not yet opened. */
export function letterDue(
  letter: { sealed?: boolean; deliverDate?: string; opened?: boolean } | undefined,
  today: string,
): boolean {
  return !!letter?.sealed && !letter.opened && !!letter.deliverDate && letter.deliverDate <= today
}
