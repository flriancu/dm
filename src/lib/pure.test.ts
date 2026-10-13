import { describe, it, expect } from 'vitest'
import { weekStart } from '../db/db'
import { dateIcs, foldLine } from './ics'
import { addMonths, isIsoDate, localIso, parseLocal, today } from './dates'
import { comboIssue, reconcile, configHelpKey, CONFIGS_FOR_ROLE } from '../state/combos'
import {
  moduleDate,
  nextModule,
  nextMeeting,
  meetingIdsOf,
  leaderAfterMeeting,
  letterDue,
  letterState,
  extrinsicWarning,
  nextCheckinAfterRhythm,
} from './course'
import { mergeDoc } from '../db/docs'
import { vttToParagraphs } from './vtt'
import { configOfHeading, orderedConfigs, CONFIGS } from '../content/plans'
import { completedModuleIds } from '../db/notes'
import { leadsMeetings, showsFriendSwitch } from '../state/roles'

describe('weekStart', () => {
  it('returns the Monday of the week', () => {
    expect(weekStart('2026-10-13')).toBe('2026-10-12') // Tuesday
    expect(weekStart('2026-10-12')).toBe('2026-10-12') // Monday
    expect(weekStart('2026-10-18')).toBe('2026-10-12') // Sunday
    expect(weekStart('2026-01-01')).toBe('2025-12-29') // crosses the year
  })
})

describe('addMonths', () => {
  it('adds months and keeps a valid date', () => {
    expect(addMonths('2026-10-13', 3)).toBe('2027-01-13')
    expect(addMonths('2026-10-13', 12)).toBe('2027-10-13')
  })
  it('clamps to the last day of the target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2026-08-31', 3)).toBe('2026-11-30')
  })
})

describe('dateIcs', () => {
  it('produces a minimal valid all-day event and escapes text', () => {
    const ics = dateIcs('2027-01-13', 'checkin', 'Verificarea; viziunii', 'linie1\nlinie2, cu virgulă')
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('DTSTART;VALUE=DATE:20270113')
    expect(ics).toContain('SUMMARY:Verificarea\\; viziunii')
    expect(ics).toContain('DESCRIPTION:linie1\\nlinie2\\, cu virgulă')
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true) // every line ends with CRLF, the last one too
    expect(ics).toContain('UID:checkin@cartea-visurilor') // one event per purpose: a new date moves it
  })
  it('folds lines over 75 octets without splitting a character', () => {
    const line = 'DESCRIPTION:' + 'ă'.repeat(60)
    const parts = foldLine(line).split('\r\n')
    expect(parts.length).toBeGreaterThan(1)
    for (const p of parts) expect(new TextEncoder().encode(p).length).toBeLessThanOrEqual(75)
    expect(parts.slice(1).every((p) => p.startsWith(' '))).toBe(true)
    expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(line)
    expect(foldLine('short')).toBe('short')
  })
  it('keeps a line break typed as CR or CRLF inside one property', () => {
    const ics = dateIcs('2027-01-13', 'x', 'a\r\nb', 'c\rd')
    expect(ics).toContain('SUMMARY:a\\nb')
    expect(ics).toContain('DESCRIPTION:c\\nd')
  })
})

describe('extrinsicWarning', () => {
  const d = (score: number, why?: 'intrinsic' | 'extrinsic', extra = {}) => ({
    text: 'x',
    dateAdded: '2026-01-01',
    score,
    why,
    ...extra,
  })
  it('warns only when the top three scored dreams are all extrinsic', () => {
    expect(
      extrinsicWarning([
        d(9, 'extrinsic'),
        d(8, 'extrinsic'),
        d(7, 'extrinsic'),
        d(10, 'intrinsic', { dateAchieved: '2026-01-02' }),
      ]),
    ).toBe(true)
    expect(extrinsicWarning([d(9, 'extrinsic'), d(8, 'intrinsic'), d(7, 'extrinsic')])).toBe(false)
    expect(extrinsicWarning([d(9, 'extrinsic'), d(8, 'extrinsic')])).toBe(false) // fewer than three scored
    expect(
      extrinsicWarning([d(9, 'extrinsic'), d(8, 'extrinsic'), d(7, 'extrinsic', { dateReleased: '2026-02-01' })]),
    ).toBe(false) // released ignored
    expect(extrinsicWarning([])).toBe(false)
  })
})

describe('role and configuration rules', () => {
  it('flags the invalid pairs and accepts the six valid ones', () => {
    expect(comboIssue('dreamer', 'pair')).toBe('pairNeedsBoth')
    expect(comboIssue('friend', 'pair')).toBe('friendNoPair')
    expect(comboIssue('both', 'solo')).toBe('bothNeedsPartner')
    for (const [role, configs] of Object.entries(CONFIGS_FOR_ROLE))
      for (const c of configs) expect(comboIssue(role as never, c)).toBeNull()
  })
  it('reconciles a change toward a valid pair', () => {
    expect(reconcile('dreamer', 'pair', 'config')).toMatchObject({ role: 'both', config: 'pair' })
    expect(reconcile('friend', 'pair', 'config')).toMatchObject({ role: 'friend', config: 'solo' })
    expect(reconcile('friend', 'pair', 'role')).toMatchObject({ role: 'friend', config: 'solo' })
    expect(reconcile('dreamer', 'pair', 'role')).toMatchObject({ role: 'dreamer', config: 'solo' })
    expect(reconcile('both', 'group', 'config')).toMatchObject({ role: 'both', config: 'group', note: null })
  })
})

describe('local dates', () => {
  it('reads years below 100 as written, not as 19xx', () => {
    expect(localIso(parseLocal('0001-01-01'))).toBe('0001-01-01')
  })
  it('accepts only real calendar days in a sensible range', () => {
    expect(isIsoDate('2028-02-29')).toBe(true)
    expect(isIsoDate('2027-02-29')).toBe(false)
    expect(isIsoDate('2026-04-31')).toBe(false)
    expect(isIsoDate('9999-99-99')).toBe(false)
    expect(isIsoDate('0001-01-01')).toBe(false)
    expect(isIsoDate('x')).toBe(false)
    expect(isIsoDate(20260101)).toBe(false)
  })
  it('round-trips a local date without touching UTC', () => {
    expect(localIso(parseLocal('2026-10-13'))).toBe('2026-10-13')
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(localIso(new Date(2026, 9, 13, 0, 30))).toBe('2026-10-13')
  })
})

describe('moduleDate', () => {
  it('starts at the start date for module 1 and adds the cadence per module', () => {
    expect(localIso(moduleDate('2026-10-13', 14, 1)!)).toBe('2026-10-13')
    expect(localIso(moduleDate('2026-10-13', 14, 3)!)).toBe('2026-11-10')
    expect(moduleDate('2026-10-13', 14, 0)).toBeNull() // module 0 has no meeting
    expect(moduleDate(undefined, 14, 2)).toBeNull()
  })
})

describe('nextModule', () => {
  const mods = [
    { id: '00', order: 0 },
    { id: '01', order: 1 },
    { id: '02', order: 2 },
  ]
  it('starts with module 0 and moves on only when a module is marked', () => {
    expect(nextModule(mods, new Set())?.id).toBe('00')
    expect(nextModule(mods, new Set(['00']))?.id).toBe('01')
    expect(nextModule(mods, new Set(['00', '01', '02']))).toBeUndefined()
  })
  it('does not skip a gap: an unmarked module stays next', () => {
    expect(nextModule(mods, new Set(['00', '02']))?.id).toBe('01')
  })
  it('names the next meeting: module 0 has none, a gap stays next', () => {
    expect(meetingIdsOf(mods)).toEqual(['01', '02'])
    expect(nextMeeting(meetingIdsOf(mods), new Set(['00']))).toBe('01')
    expect(nextMeeting(['01', '02', '03'], new Set(['01', '03']))).toBe('02')
    expect(nextMeeting(['01'], new Set(['01']))).toBeUndefined()
  })
  it('a change of check-in rhythm keeps a due check-in due, and counts from the last one otherwise', () => {
    expect(nextCheckinAfterRhythm({ next: '2027-01-13', everyMonths: 3 }, 6, '2027-01-20')).toBe('2027-01-13')
    expect(
      nextCheckinAfterRhythm({ lastDone: '2026-10-13', next: '2027-01-13', everyMonths: 3 }, 6, '2026-11-01'),
    ).toBe('2027-04-13')
    expect(nextCheckinAfterRhythm({ next: '2027-01-13', everyMonths: 3 }, 6, '2026-11-01')).toBe('2027-04-13')
    expect(nextCheckinAfterRhythm({}, 3, '2026-10-13')).toBe('2027-01-13')
  })
})

describe('pair leadership and the sealed letter', () => {
  it('passes the lead to the other person after each meeting', () => {
    expect(leaderAfterMeeting(true)).toBe(false)
    expect(leaderAfterMeeting(false)).toBe(true)
  })
  it('surfaces the letter only when sealed, due and unopened', () => {
    expect(letterDue({ sealed: true, deliverDate: '2026-10-01' }, '2026-10-13')).toBe(true)
    expect(letterDue({ sealed: true, deliverDate: '2026-12-01' }, '2026-10-13')).toBe(false)
    expect(letterDue({ sealed: true, deliverDate: '2026-10-01', opened: true }, '2026-10-13')).toBe(false)
    expect(letterDue({ sealed: false, deliverDate: '2026-10-01' }, '2026-10-13')).toBe(false)
    expect(letterDue(undefined, '2026-10-13')).toBe(false)
  })
  it('knows where the letter is: draft, sealed, arrived, read', () => {
    expect(letterState(undefined, '2026-10-13')).toBe('draft')
    expect(letterState({ sealed: true, deliverDate: '2026-12-01' }, '2026-10-13')).toBe('sealed')
    expect(letterState({ sealed: true, deliverDate: '2026-10-13' }, '2026-10-13')).toBe('arrived')
    expect(letterState({ sealed: true, deliverDate: '2026-12-01', opened: true }, '2026-10-13')).toBe('read')
  })
})

describe('mergeDoc', () => {
  it('merges nested objects one level deep and replaces arrays', () => {
    type D = { a: { x?: string; y?: string }; list: number[]; n?: number }
    const cur: D = { a: { x: '1', y: '2' }, list: [1, 2] }
    expect(mergeDoc(cur, { a: { y: '3' } }, ['a'])).toEqual({ a: { x: '1', y: '3' }, list: [1, 2] })
    expect(mergeDoc(cur, { list: [9] }, ['a'])).toEqual({ a: { x: '1', y: '2' }, list: [9] })
    expect(mergeDoc(cur, { n: 5 }, ['a']).n).toBe(5)
  })
})

describe('configHelpKey', () => {
  it("picks the help written from the reader's own role", () => {
    expect(configHelpKey('dreamer', 'solo')).toBe('config.help.solo.dreamer')
    expect(configHelpKey('friend', 'solo')).toBe('config.help.solo.friend')
    expect(configHelpKey('both', 'pair')).toBe('config.help.pair')
    expect(configHelpKey('dreamer', 'group')).toBe('config.help.group.dreamer')
    expect(configHelpKey('friend', 'group')).toBe('config.help.group.friend')
    expect(configHelpKey('both', 'group')).toBe('config.help.group.both')
  })
})

describe('plan headings and configuration order', () => {
  it('maps a table heading to its configuration by prefix, with or without a duration', () => {
    expect(configOfHeading('Un Visător și Prietenul lui (90 de minute)')).toBe('solo')
    expect(configOfHeading('Pereche de egali')).toBe('pair')
    expect(configOfHeading('Prieten al Visului și grup (2 ore, 3–8 Visători și tu)')).toBe('group')
    expect(configOfHeading('Întrebări de pus Visătorului în acest modul')).toBeNull()
  })
  it('puts the chosen configuration first and keeps the other two', () => {
    expect(orderedConfigs('pair')).toEqual(['pair', 'solo', 'group'])
    expect(orderedConfigs('solo')).toEqual([...CONFIGS])
  })
})

describe('module notes and leadership', () => {
  it('counts a module as done only when the meeting was held', () => {
    expect([
      ...completedModuleIds([
        { moduleId: '00', completedOn: '2026-10-13' },
        { moduleId: '01', oneWord: 'curios' },
      ]),
    ]).toEqual(['00'])
  })
  it('knows who leads from role, configuration and the pair switch', () => {
    expect(leadsMeetings({ role: 'friend', config: 'solo', friendToday: false })).toBe('me')
    expect(leadsMeetings({ role: 'both', config: 'group', friendToday: false })).toBe('me')
    expect(leadsMeetings({ role: 'both', config: 'pair', friendToday: true })).toBe('me')
    expect(leadsMeetings({ role: 'both', config: 'pair', friendToday: false })).toBe('other')
    expect(leadsMeetings({ role: 'dreamer', config: 'solo', friendToday: false })).toBeNull()
    expect(showsFriendSwitch({ role: 'both', config: 'pair' })).toBe(true)
    expect(showsFriendSwitch({ role: 'both', config: 'group' })).toBe(false)
  })
})

describe('vttToParagraphs', () => {
  it('drops timings and ids, joins cue lines and splits at sentence ends', () => {
    const vtt = [
      'WEBVTT',
      '',
      'abc-0',
      '00:00:01.000 --> 00:00:02.000',
      'Hi, this',
      'is Shirzad.',
      '',
      '00:00:03.000 --> 00:00:04.000',
      'Sit down',
      '',
      '00:00:05.000 --> 00:00:06.000',
      'and breathe.',
      '',
    ].join('\n')
    expect(vttToParagraphs(vtt)).toEqual(['Hi, this is Shirzad.', 'Sit down and breathe.'])
    expect(vttToParagraphs('WEBVTT')).toEqual([])
  })
})
