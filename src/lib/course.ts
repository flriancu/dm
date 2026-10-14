import { addDays, addMonths, localIso, parseLocal } from './dates'

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

/** The modules that have a meeting (module 0 is read alone), as ids in course order. */
export function meetingIdsOf(modules: readonly ModuleRef[]): string[] {
  return modules.filter((m) => m.order > 0).map((m) => m.id)
}

/** The meeting that comes next: the first one not yet held. */
export function nextMeeting(meetingIds: readonly string[], done: Set<string>): string | undefined {
  return meetingIds.find((id) => !done.has(id))
}

/** True when the top-scored dreams still in play are all extrinsic (FR-11 warning). */
export function extrinsicWarning(
  dreams: readonly { score?: number; why?: string; dateReleased?: string; dateAchieved?: string }[],
  top = 3,
): boolean {
  const scored = dreams
    .filter((d) => d.score && !d.dateReleased && !d.dateAchieved)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, top)
  return scored.length >= top && scored.every((d) => d.why === 'extrinsic')
}

/** The next check-in after a change of rhythm: a check-in that is already due stays due; otherwise it counts from the last one. */
export function nextCheckinAfterRhythm(
  c: { next?: string; lastDone?: string; everyMonths?: number },
  months: number,
  now: string,
): string {
  if (c.next && c.next <= now) return c.next
  const base = c.lastDone ?? (c.next && c.everyMonths ? addMonths(c.next, -c.everyMonths) : now)
  return addMonths(base, months)
}

/** In a peer pair the two take turns leading. Given who leads the next meeting, says who leads the one after. */
export function leaderAfterMeeting(iLeadNow: boolean): boolean {
  return !iLeadNow
}

/**
 * Where the letter from the future self is: being written, sealed before its date, arrived
 * (date reached, not read yet) or read (on the date, or opened early on purpose).
 */
export type LetterState = 'draft' | 'sealed' | 'arrived' | 'read'
export function letterState(
  letter: { sealed?: boolean; deliverDate?: string; opened?: boolean } | undefined,
  today: string,
): LetterState {
  if (letter?.opened) return 'read'
  if (!letter?.sealed) return 'draft'
  return (letter.deliverDate ?? '') > today ? 'sealed' : 'arrived'
}

/** Whether the letter should be surfaced on Home: its date has come and it has not been read yet. */
export function letterDue(
  letter: { sealed?: boolean; deliverDate?: string; opened?: boolean } | undefined,
  today: string,
): boolean {
  return letterState(letter, today) === 'arrived'
}

/** The dates of all meetings (module 1 onwards), for one calendar file; empty without a start date. */
export function meetingDates<M extends ModuleRef & { title: string }>(
  modules: readonly M[],
  start: string | undefined,
  cadence: number,
): { module: M; date: string }[] {
  return modules.flatMap((m) => {
    const d = moduleDate(start, cadence, m.order)
    return d ? [{ module: m, date: localIso(d) }] : []
  })
}
