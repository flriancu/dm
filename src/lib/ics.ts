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

/**
 * A minimal all-day event. `date` is a local ISO date (yyyy-mm-dd). The UID names the
 * purpose only, so a calendar that imports the file again after the date changed moves the
 * event instead of keeping two.
 */
export function dateIcs(date: string, uid: string, title: string, body: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const d = date.replace(/-/g, '')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cartea Visurilor//RO',
    'BEGIN:VEVENT',
    `UID:${uid}@cartea-visurilor`,
    `DTSTAMP:${stamp}`,
    `SEQUENCE:${Math.floor(Date.now() / 1000)}`,
    `DTSTART;VALUE=DATE:${d}`,
    `SUMMARY:${esc(title)}`,
    `DESCRIPTION:${esc(body)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(foldLine).join('\r\n') + '\r\n'
}

export const letterIcs = (date: string, title: string, body: string) => dateIcs(date, 'letter', title, body)

/** Offers a text file for download; the caller passes the name and content. */
export function downloadText(name: string, text: string, type = 'text/calendar') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
