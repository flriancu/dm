import { describe, it, expect, beforeEach } from 'vitest'
import { DreamDB, DEFAULT_SETTINGS, TEXT_LONG, TEXT_SHORT, today } from './db'
import { settingsFrom, MAX_ID, TABLE_NAMES } from './schema'
import { importAll, planImport, readBackupFile, ImportError, MAX_BACKUP_BYTES } from './exportImport'
import { readSettings } from './settings'

const backup = (extra: Record<string, unknown> = {}) => ({
  app: 'dream-course',
  schema: 1,
  dreams: [],
  plans: [],
  settings: [],
  ...extra,
})

describe('settings read through the schema', () => {
  it('keeps valid values and falls back to the default for anything else', () => {
    const s = settingsFrom([
      { key: 'uiLocale', value: 'fr' },
      { key: 'startDate', value: 'x' },
      { key: 'role', value: 'admin' },
      { key: 'cadenceDays', value: 1e9 },
      { key: 'paperCount', value: -3 },
      { key: 'onboarded', value: 'false' },
      { key: 'saboteurs', value: ['judge', 'nope', 'judge', 'victim', 'pleaser', 'avoider'] },
      { key: 'strengths', value: null },
      { key: 'criteria', value: 'not a list' },
      { key: 'theme', value: 123 },
    ])
    expect(s.uiLocale).toBe('ro')
    expect(s.startDate).toBeUndefined()
    expect(s.role).toBe('dreamer')
    expect(s.cadenceDays).toBe(42) // clamped, not dropped
    expect(s.paperCount).toBe(0)
    expect(s.onboarded).toBe(false) // only a real boolean counts
    expect(s.saboteurs).toEqual(['victim', 'pleaser', 'avoider']) // known, pickable (the Judge is everyone's), no repeats, three at most
    expect(s.strengths).toEqual([])
    expect(s.criteria).toEqual([])
    expect(s.theme).toBe('system')
  })
  it('ignores unknown keys, including ones that would reach the prototype', () => {
    const s = settingsFrom([
      { key: '__proto__', value: { startDate: 'x', onboarded: true } },
      { key: 'constructor', value: 1 },
      { key: 'toString', value: 1 },
    ])
    expect(s).toEqual(DEFAULT_SETTINGS)
    expect(Object.getPrototypeOf(s)).toBe(Object.prototype)
    expect((s as unknown as Record<string, unknown>).startDate).toBeUndefined()
  })
})

describe('import checks every row', () => {
  let d: DreamDB
  beforeEach(() => {
    d = new DreamDB(`t-schema-${Math.random()}`)
  })

  it('refuses what is not a backup, and files too large to be one', async () => {
    for (const raw of [null, [], 1, 'x', { app: 'dream-course', schema: 2, dreams: [], plans: [], settings: [] }])
      await expect(planImport(raw, d)).rejects.toBeInstanceOf(ImportError)
    const huge = { size: MAX_BACKUP_BYTES + 1, text: async () => '{}' } as unknown as Blob
    await expect(readBackupFile(huge)).rejects.toMatchObject({ reason: 'tooLarge' })
    const bom = new Blob(['﻿' + JSON.stringify(backup())])
    expect(await readBackupFile(bom)).toMatchObject({ app: 'dream-course' })
  })

  it('drops unusable rows, fixes what can be fixed, and counts both', async () => {
    const plan = await importAll(
      backup({
        dreams: [
          { id: 1, text: 'a', dateAdded: 'x', chosen: true },
          { id: 1, text: 'repeated id' },
          { id: 2 ** 53, text: 'key generator killer' },
          { id: 0, text: 'id zero' },
          { id: 3, text: { not: 'text' } },
          { id: 4, text: 'second chosen', chosen: 1, dateAdded: '2026-01-01' },
          { id: 5, text: 'x'.repeat(TEXT_LONG + 50), dateAdded: '2026-01-01' },
          { id: 6, text: 'y'.repeat(TEXT_SHORT + 50), dateAdded: '2026-01-01' },
        ],
        dreamWork: [
          { dreamId: 1, friends: 'x', routes: [5, 'b'], habitLog: {}, letgo: { signs: 'sleep' } },
          { dreamId: 99, clarify: { clarity: 'orphan' } },
        ],
        weekTasks: [
          { id: 1, text: 't', quadrant: 'zzz', moved: 1 },
          { id: 2, text: 'u', moved: 1 },
        ],
        wheels: [{ id: 1, values: [1, 2, 3], swls: [1, 1, 1, 1, 1] }],
        journal: [{ id: 1, date: 'x' }],
        vision: [{ id: 'me', values: null, letter: { sealed: true, deliverDate: 'never' } }],
        settings: [{ key: 'uiLocale', value: 'xx' }, { key: 'onboarded', value: true }, { foo: 1 }],
      }),
      d,
    )
    const dreams = await d.dreams.toArray()
    expect(dreams.map((x) => x.id)).toEqual([1, 4, 5, 6])
    expect(dreams[0].dateAdded).toBe(today()) // unreadable date replaced
    expect(dreams.filter((x) => x.chosen === 1).map((x) => x.id)).toEqual([1]) // one chosen, as a number
    expect(dreams[2].text.length).toBe(TEXT_LONG) // cut only past the paragraph limit
    expect(dreams[3].text.length).toBe(TEXT_SHORT + 50) // a long title from an older version survives
    const work = await d.dreamWork.toArray()
    expect(work.map((w) => w.dreamId)).toEqual([1]) // the orphan worksheet is gone
    expect(work[0].friends).toBeUndefined()
    expect(work[0].routes).toEqual(['', 'b']) // positions kept: a bad route does not shift the next
    expect(work[0].letgo?.signs).toBeUndefined()
    const tasks = await d.weekTasks.toArray()
    expect(tasks[0].quadrant).toBeUndefined()
    expect(tasks.filter((x) => x.moved === 1)).toHaveLength(1)
    expect(await d.wheels.count()).toBe(0) // a wheel without all its areas cannot be drawn
    expect(await d.journal.count()).toBe(0) // an entry without "what happened" is not an entry
    const v = (await d.vision.get('me'))!
    expect(v.values).toHaveLength(10)
    expect(v.valueActs).toEqual([])
    expect(v.worksheet).toEqual({})
    expect(v.letter?.deliverDate).toBeUndefined()
    const s = await readSettings(d)
    expect(s.uiLocale).toBe('ro')
    expect(s.onboarded).toBe(true)
    expect(plan.dropped).toBeGreaterThan(0)
    // every id the file could set is far below the point where IndexedDB stops numbering new rows
    expect(Math.max(...dreams.map((x) => x.id!))).toBeLessThan(MAX_ID)
    await d.dreams.add({ text: 'still possible', dateAdded: today(), chosen: 0 })
  })

  it('refuses a file whose table is there but not a list, rather than guess', async () => {
    await d.dreamWork.put({ dreamId: 1, clarify: { clarity: 'old' }, updated: today() })
    await expect(planImport(backup({ dreams: [{ id: 1, text: 'new' }], dreamWork: {} }), d)).rejects.toMatchObject({
      reason: 'notBackup',
    })
    expect((await d.dreamWork.get(1))?.clarify?.clarity).toBe('old')
  })

  it('merges settings by key: a setting the file lacks keeps its value, a key without a value is unset', async () => {
    await d.settings.bulkPut([
      { key: 'onboarded', value: true },
      { key: 'theme', value: 'dark' },
      { key: 'startDate', value: '2026-10-01' },
    ])
    await importAll(
      backup({ settings: [{ key: 'uiLocale', value: 'en' }, { key: 'startDate' }, { key: 'onboarded', value: 1 }] }),
      d,
    )
    const s = await readSettings(d)
    expect(s).toMatchObject({ onboarded: true, theme: 'dark', uiLocale: 'en' })
    expect(s.startDate).toBeUndefined()
  })

  it('keeps ids the app itself gives after an id near the limit', async () => {
    await importAll(backup({ dreams: [{ id: MAX_ID - 1, text: 'near the limit' }] }), d)
    const added = (await d.dreams.add({ text: 'added after', dateAdded: today(), chosen: 0 })) as number
    const again = await planImport(backup({ dreams: await d.dreams.toArray() }), d)
    expect(added).toBe(MAX_ID)
    expect(again.tables.dreams).toHaveLength(2)
  })

  it('replaces the tables in the file and leaves the others (FR-61: Friend notes apart)', async () => {
    await d.friendNotes.add({ moduleId: '01', text: 'kept', created: today() })
    await d.journal.add({ date: today(), happened: 'kept too' })
    await d.dreams.add({ text: 'replaced', dateAdded: today(), chosen: 0 })
    const plan = await importAll(backup({ dreams: [{ id: 7, text: 'from the file' }] }), d)
    expect(plan.kept).toContain('friendNotes')
    expect(await d.friendNotes.count()).toBe(1)
    expect(await d.journal.count()).toBe(1)
    expect((await d.dreams.toArray()).map((x) => x.text)).toEqual(['from the file'])
  })
})

describe('the backup covers the whole database', () => {
  it('has a row check for every table, so a new table cannot be left out of backups', () => {
    const tables = new DreamDB(`t-cover-${Math.random()}`).tables.map((t) => t.name).sort()
    expect([...TABLE_NAMES].sort()).toEqual(tables)
  })
})
