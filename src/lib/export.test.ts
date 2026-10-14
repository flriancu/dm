import { describe, it, expect } from 'vitest'
import ro from '../i18n/locales/ro.json'
import { DEFAULT_SETTINGS, type Settings, type VisionDoc } from '../db/db'
import type { BackupTables } from '../db/schema'
import { bookMarkdown, escapeLine, text } from './book'
import { calendarIcs, dateIcs } from './ics'
import { meetingDates } from './course'
import { shareableFile } from './files'

const dict = ro as Record<string, string>
const t = (k: string, v?: Record<string, string | number>) =>
  (dict[k] ?? k).replace(/\{(\w+)\}/g, (_, n: string) => String(v?.[n] ?? `{${n}}`))
const fmtDate = (d: string) => d
const book = (data: Partial<BackupTables>, s: Partial<Settings> = {}) =>
  bookMarkdown({ data, settings: { ...DEFAULT_SETTINGS, ...s }, t, fmtDate, today: '2026-10-14' })

const vision = (patch: Partial<VisionDoc>): VisionDoc => ({
  id: 'me',
  values: [],
  valueActs: [],
  worksheet: {},
  updated: '2026-10-14',
  ...patch,
})

describe('my book (Markdown export)', () => {
  it('lists the dreams with their marks and the chosen dream with its worksheets', () => {
    const md = book({
      dreams: [
        { id: 1, text: 'Zece zile prin Apuseni', dateAdded: '2026-10-01', chosen: 1, score: 9, why: 'intrinsic' },
        { id: 2, text: 'Un ceas scump', dateAdded: '2026-10-02', dateReleased: '2026-10-10' },
      ],
      dreamWork: [
        { dreamId: 1, clarify: { clarity: 'cu sora mea' }, woop: { obstacle: 'telefonul seara' }, updated: '' },
      ],
    })
    expect(md).toMatch(/^# Cartea mea/)
    expect(md).toContain('1. ★ Zece zile prin Apuseni (9/10')
    expect(md).toContain('Renunțat pe 2026-10-10')
    expect(md).toContain('## Visul la care lucrez')
    expect(md).toContain('cu sora mea')
    expect(md).toContain('telefonul seara')
  })

  it('leaves out sections with nothing written', () => {
    const md = book({ dreams: [], weekTasks: [], journal: [], vision: [vision({})] })
    expect(md).not.toContain('## ')
  })

  it('keeps a sealed letter sealed, and shows a read one', () => {
    const sealed = book({ vision: [vision({ letter: { text: 'SECRET', sealed: true, deliverDate: '2027-04-01' } })] })
    expect(sealed).not.toContain('SECRET')
    expect(sealed).toContain('2027-04-01')
    const arrived = book({ vision: [vision({ letter: { text: 'SECRET', sealed: true, deliverDate: '2026-10-01' } })] })
    expect(arrived).not.toContain('SECRET') // arrived but not read yet: the reading happens in the app
    const read = book({
      vision: [vision({ letter: { text: 'Dragă eu', sealed: true, opened: true, deliverDate: '2026-10-01' } })],
    })
    expect(read).toContain('Dragă eu')
    const draft = book({ vision: [vision({ letter: { text: 'Încă scriu' } })] })
    expect(draft).toContain('Încă scriu')
  })

  it('in paper mode gives the count instead of a list', () => {
    expect(book({ dreams: [] }, { paperMode: true, paperCount: 42 })).toContain('42 visuri')
  })

  it('escapes user lines that would become Markdown structure', () => {
    expect(escapeLine('# nu e titlu')).toBe('\\# nu e titlu')
    expect(escapeLine('- nu e listă')).toBe('\\- nu e listă')
    expect(escapeLine('3. nu e număr')).toBe('\\3. nu e număr')
    expect(escapeLine('> nu e citat')).toBe('\\> nu e citat')
    expect(escapeLine('---')).toBe('\\---')
    expect(escapeLine('text obișnuit #1')).toBe('text obișnuit #1')
    expect(text('rândul unu\r\n# rândul doi')).toBe('rândul unu  \n\\# rândul doi')
    const md = book({ dreams: [{ id: 1, text: '# capturat\n- și asta', dateAdded: '2026-10-01' }] })
    expect(md).not.toMatch(/^# capturat/m)
    expect(md).not.toMatch(/^- și asta/m)
  })

  it('includes the Dream Friend notes and per-module notes', () => {
    const md = book({
      moduleNotes: [{ moduleId: '03', takeaways: 'obstacolul e în mine', oneWord: 'clar' }],
      friendNotes: [{ id: 1, moduleId: '02', text: 'a vorbit ușor', created: '2026-10-05' }],
    })
    expect(md).toContain('### Modulul 3')
    expect(md).toContain('obstacolul e în mine')
    expect(md).toContain('a vorbit ușor')
  })
})

describe('calendar files', () => {
  it('puts several all-day events in one file, each with a stable id', () => {
    const ics = calendarIcs([
      { date: '2026-11-03', uid: 'meeting-01', title: 'Întâlnirea 1', body: 'x' },
      { date: '2026-11-17', uid: 'meeting-02', title: 'Întâlnirea 2', body: 'y' },
    ])
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics).toContain('UID:meeting-01@cartea-visurilor')
    expect(ics).toContain('DTSTART;VALUE=DATE:20261117')
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(ics.split('\r\n').every((l) => new TextEncoder().encode(l).length <= 75)).toBe(true)
  })
  it('keeps the single-date file as before', () => {
    expect(dateIcs('2027-01-13', 'checkin', 'a', 'b').match(/BEGIN:VEVENT/g)).toHaveLength(1)
  })
  it('lists one date per meeting from the start date and the cadence, none for module 0', () => {
    const mods = [0, 1, 2, 3].map((order) => ({ id: `0${order}`, order, title: `M${order}` }))
    const d = meetingDates(mods, '2026-10-13', 14)
    expect(d.map((x) => x.date)).toEqual(['2026-10-13', '2026-10-27', '2026-11-10'])
    expect(meetingDates(mods, undefined, 14)).toEqual([])
  })
})

describe('sharing a file', () => {
  it('offers the file as it is when the share sheet takes it', () => {
    const f = shareableFile('a.json', '{}', 'application/json', () => true)
    expect(f?.name).toBe('a.json')
  })
  it('falls back to plain text with .txt added when the type is refused', () => {
    const f = shareableFile('cartea.md', '# x', 'text/markdown', (x) => x.type === 'text/plain')
    expect(f?.name).toBe('cartea.md.txt')
    expect(f?.type).toBe('text/plain')
  })
  it('gives up when nothing is accepted', () => {
    expect(shareableFile('a.json', '{}', 'application/json', () => false)).toBeNull()
  })
})
