/**
 * Local-calendar date helpers. All course dates are "YYYY-MM-DD" in the user's own
 * calendar day; nothing here goes through UTC (toISOString shifts the day for anyone
 * east of Greenwich).
 */
export function localIso(d: Date): string {
  const y = String(d.getFullYear()).padStart(4, '0'),
    m = String(d.getMonth() + 1).padStart(2, '0'),
    day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseLocal(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(2000, (m || 1) - 1, d || 1)
  date.setFullYear(y) // the Date constructor reads years 0–99 as 1900–1999
  return date
}

/** True for a real calendar day written as yyyy-mm-dd (no 31 April), in years the course can mean. */
export function isIsoDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
  const y = Number(s.slice(0, 4))
  return y >= 1900 && y <= 2999 && localIso(parseLocal(s)) === s
}

export const today = () => localIso(new Date())

/** Milliseconds until the next local midnight, when today() changes. */
export function msToNextDay(now = new Date()): number {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

export function addDays(iso: string, n: number): string {
  const d = parseLocal(iso)
  d.setDate(d.getDate() + n)
  return localIso(d)
}

/** Adds months, clamping to the last day of the target month (31 Jan + 1 → 28/29 Feb). */
export function addMonths(iso: string, n: number): string {
  const d = parseLocal(iso)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, last))
  return localIso(d)
}

/** Monday of the week containing the date. */
export function weekStart(iso: string): string {
  const d = parseLocal(iso)
  const back = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - back)
  return localIso(d)
}
