/** iCalendar files for the dates the course asks the learner to put in the phone calendar (FR-41, FR-45). */

const esc = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n')

const utf8 = new TextEncoder()

/**
 * RFC 5545 §3.1: lines longer than 75 octets are folded, each continuation starting with a
 * space; a fold never splits a UTF-8 character (Romanian diacritics are two octets).
 */
export function foldLine(line: string): string {
  const out: string[] = []
  let cur = ''
  let size = 0
  for (const ch of line) {
    const n = utf8.encode(ch).length
    const limit = out.length === 0 ? 75 : 74 // a continuation line also carries its leading space
    if (size + n > limit) {
      out.push(cur)
      cur = ''
      size = 0
    }
    cur += ch
    size += n
  }
  out.push(cur)
  return out.join('\r\n ')
}

/** One all-day event: a local ISO date (yyyy-mm-dd), a stable id, a title and a description. */
export interface CalendarEvent {
  date: string
  uid: string
  title: string
  body: string
}

/**
 * A calendar file with all-day events. Each UID names the purpose only (for example
 * "meeting-03"), so a calendar that imports the file again after the dates changed moves
 * the events instead of keeping two of each.
 */
export function calendarIcs(events: readonly CalendarEvent[]): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const seq = Math.floor(Date.now() / 1000)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cartea Visurilor//RO']
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@cartea-visurilor`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${seq}`,
      `DTSTART;VALUE=DATE:${e.date.replace(/-/g, '')}`,
      `SUMMARY:${esc(e.title)}`,
      `DESCRIPTION:${esc(e.body)}`,
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

/** A calendar file with a single all-day event. */
export function dateIcs(date: string, uid: string, title: string, body: string): string {
  return calendarIcs([{ date, uid, title, body }])
}
