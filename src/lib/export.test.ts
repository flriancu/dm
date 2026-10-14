import { describe, it, expect } from 'vitest'
import ro from '../i18n/locales/ro.json'
import { DEFAULT_SETTINGS, type Settings, type VisionDoc } from '../db/db'
import type { BackupTables } from '../db/schema'
import { marked } from 'marked'
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

  it('escapes block markers where they start a line, and a numbered line without a stray backslash', () => {
    expect(escapeLine('# nu e titlu')).toBe('\\# nu e titlu')
    expect(escapeLine('- nu e listă')).toBe('\\- nu e listă')
    expect(escapeLine('3. nu e număr')).toBe('3\\. nu e număr')
    expect(escapeLine('---')).toBe('\\---')
    expect(escapeLine('    indentat')).toBe('indentat') // four spaces would start a code block
    expect(text('rândul unu\r\n\r\n# rândul doi')).toBe('rândul unu  \n\\# rândul doi')
  })

  // what a reader of the rendered book sees: the HTML a Markdown viewer makes, without tags, entities decoded
  const seen = (md: string) =>
    (marked.parse(md, { async: false }) as string)
      .replace(/<br\s*\/?>/g, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&')
  const lines = (s: string) =>
    s
      .split(/\r\n?|\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n')
  const HOSTILE = [
    '# titlu',
    '## sub',
    '- listă',
    '* listă',
    '+ listă',
    '1. număr',
    '2026) an',
    '> citat',
    '---',
    '***',
    '___',
    '_ _ _',
    'Azi am alergat 5 km\n-',
    'Rândul unu\n===',
    '```\ncod\n```',
    '~~~\ncod',
    '    indentat\n\n    cod',
    '| a | b |\n|---|---|\n| 1 | 2 |',
    '**gras** și _înclinat_ și `cod` și ~~tăiat~~',
    '[x](javascript:alert(1))',
    '[ref]: http://x',
    '<script>alert(1)</script>',
    '<img src=x onerror=alert(1)>',
    'Răbdare <3\n<!-- de recitit\nși curaj',
    '&lt; &amp; &#39;',
    'a\\b \\* c',
    '5*3=15 și 2_000',
    '😀 שלום مرحبا',
    'vezi https://ro.wikipedia.org/wiki/Aurora_polară și www.example.com/~ana/a_b',
    'https://www.youtube.com/watch?v=abc&t=10s, apoi (https://x.ro/a_b_c).',
    '_https://x.ro/a_ și *www.x.ro* și awww.x',
    'https://x.ro/*a*\\b`c`|[d]<b>x</b> și https://x.ro<script>alert(1)</script>',
  ]
  const ADDRESSES = [
    ['vezi https://ro.wikipedia.org/wiki/Aurora_polară.', 'https://ro.wikipedia.org/wiki/Aurora_polar%C4%83'],
    ['https://www.youtube.com/watch?v=abc&t=10s', 'https://www.youtube.com/watch?v=abc&amp;t=10s'],
    ['(vezi https://x.ro/a_(b))', 'https://x.ro/a_(b)'],
    ['https://x.ro/*a*`b`', 'https://x.ro/*a*%60b%60'],
  ]
  it('writes a web address so that it works as a link, exactly as typed', () => {
    for (const [s, href] of ADDRESSES) {
      const html = marked.parse(text(s), { async: false }) as string
      expect(html).toContain(`href="${href}"`)
      expect(html).not.toContain('\\')
    }
  })
  const markup = (s: string) => {
    const html = marked.parse(`- **Notă:** ${text(s, '  ')}`, { async: false }) as string
    return (
      /<(h\d|blockquote|pre|code|table|hr|img|script|em|del|ol|b|!--)\b/.test(html) ||
      /href="(?!https?:|mailto:)/.test(html)
    )
  }
  // a web address may become a link (its text stays the same); nothing else may become markup
  it('reads back exactly as written in a Markdown viewer, whatever the learner typed', () => {
    for (const s of HOSTILE) {
      expect({ s, markup: markup(s) }).toEqual({ s, markup: false })
      expect(lines(seen(text(s)))).toBe(lines(s))
      expect(lines(seen(`- **Notă:** ${text(s, '  ')}`))).toBe(lines(`Notă: ${lines(s)}`))
    }
  })

  it('keeps the worksheets of a dream released or achieved', () => {
    const md = book({
      dreams: [
        { id: 1, text: 'Primul vis', dateAdded: '2026-10-01', chosen: 0, dateReleased: '2026-10-10' },
        { id: 2, text: 'Al doilea', dateAdded: '2026-10-01', chosen: 1 },
      ],
      dreamWork: [
        { dreamId: 1, clarify: { clarity: 'FOAIE-VECHE' }, updated: '' },
        { dreamId: 2, woop: { wish: 'FOAIE-NOUA' }, updated: '' },
      ],
    })
    expect(md).toContain('FOAIE-VECHE')
    expect(md).toContain('FOAIE-NOUA')
    expect(md.indexOf('FOAIE-NOUA')).toBeLessThan(md.indexOf('FOAIE-VECHE')) // the chosen dream comes first
  })

  it('never writes a sealed or arrived letter, past letters included, and says when one has arrived', () => {
    const md = book({
      vision: [
        vision({
          letter: { text: 'SOSITA', sealed: true, deliverDate: '2026-10-01' },
          pastLetters: [
            { text: 'SIGILATA', sealed: true, deliverDate: '2027-04-01' },
            { text: 'CITITA', sealed: true, opened: true, deliverDate: '2026-01-01' },
            { text: 'CIORNA' }, // never sealed: only a backup can put it here
          ],
        }),
      ],
    })
    expect(md).not.toContain('SOSITA')
    expect(md).not.toContain('SIGILATA')
    expect(md).toContain('CITITA')
    expect(md).not.toContain('CIORNA')
    expect(md).toMatch(/### .*\(1\)/) // the read letters, counted
    expect(md).toContain('a sosit')
  })

  it("includes the per-module notes and never the Dream Friend's notes (FR-61)", () => {
    const md = book({
      moduleNotes: [{ moduleId: '03', takeaways: 'obstacolul e în mine', oneWord: 'clar' }],
      friendNotes: [{ id: 1, moduleId: '02', text: 'a vorbit ușor', created: '2026-10-05' }],
    })
    expect(md).toContain('### Modulul 3')
    expect(md).toContain('obstacolul e în mine')
    expect(md).not.toContain('a vorbit ușor')
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
