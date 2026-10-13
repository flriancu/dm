/** iCalendar files for the dates the course asks the learner to put in the phone calendar (FR-41, FR-45). */

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** A minimal all-day event. `date` is a local ISO date (yyyy-mm-dd). */
export function dateIcs(date: string, uid: string, title: string, body: string): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z'
  const d = date.replace(/-/g, '')
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Cartea Visurilor//RO', 'BEGIN:VEVENT', `UID:${uid}-${d}@cartea-visurilor`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(body)}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}

export const letterIcs = (date: string, title: string, body: string) => dateIcs(date, 'letter', title, body)

/** Offers a text file for download; the caller passes the name and content. */
export function downloadText(name: string, text: string, type = 'text/calendar') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
