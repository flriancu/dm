import { describe, it, expect } from 'vitest'
import { weekStart } from '../db/db'
import { dateIcs } from '../pages/Vision'
import { addMonths, localIso, parseLocal, today } from './dates'
import { extrinsicWarning } from '../pages/Dreams'
import { comboIssue, reconcile, CONFIGS_FOR_ROLE } from '../state/combos'
import { moduleDate } from '../pages/Home'

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
    expect(ics).toContain('BEGIN:VCALENDAR'); expect(ics).toContain('DTSTART;VALUE=DATE:20270113')
    expect(ics).toContain('SUMMARY:Verificarea\\; viziunii')
    expect(ics).toContain('DESCRIPTION:linie1\\nlinie2\\, cu virgulă')
    expect(ics.split('\r\n').at(-1)).toBe('END:VCALENDAR')
  })
})

describe('extrinsicWarning', () => {
  const d = (score: number, why?: 'intrinsic' | 'extrinsic', extra = {}) => ({ text: 'x', dateAdded: '2026-01-01', score, why, ...extra })
  it('warns only when the top three scored dreams are all extrinsic', () => {
    expect(extrinsicWarning([d(9, 'extrinsic'), d(8, 'extrinsic'), d(7, 'extrinsic'), d(10, 'intrinsic', { dateAchieved: '2026-01-02' })])).toBe(true)
    expect(extrinsicWarning([d(9, 'extrinsic'), d(8, 'intrinsic'), d(7, 'extrinsic')])).toBe(false)
    expect(extrinsicWarning([d(9, 'extrinsic'), d(8, 'extrinsic')])).toBe(false) // fewer than three scored
    expect(extrinsicWarning([d(9, 'extrinsic'), d(8, 'extrinsic'), d(7, 'extrinsic', { dateReleased: '2026-02-01' })])).toBe(false) // released ignored
    expect(extrinsicWarning([])).toBe(false)
  })
})

describe('role and configuration rules', () => {
  it('flags the invalid pairs and accepts the six valid ones', () => {
    expect(comboIssue('dreamer', 'pair')).toBe('pairNeedsBoth')
    expect(comboIssue('friend', 'pair')).toBe('friendNoPair')
    expect(comboIssue('both', 'solo')).toBe('bothNeedsPartner')
    for (const [role, configs] of Object.entries(CONFIGS_FOR_ROLE)) for (const c of configs) expect(comboIssue(role as never, c)).toBeNull()
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
    expect(localIso(moduleDate('2026-10-13', 14, 0)!)).toBe('2026-10-13')
    expect(moduleDate(undefined, 14, 2)).toBeNull()
  })
})
