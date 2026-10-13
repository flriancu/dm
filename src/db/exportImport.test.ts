import { describe, it, expect, beforeEach } from 'vitest'
import { DreamDB, readSettings, writeSettings, today } from './db'
import { exportAll, importAll, isExportFile } from './exportImport'

describe('export / import round trip (FR-50, acceptance 3)', () => {
  let a: DreamDB
  let b: DreamDB
  beforeEach(async () => {
    a = new DreamDB(`t-a-${Math.random()}`)
    b = new DreamDB(`t-b-${Math.random()}`)
  })

  it('restores dreams, plans, notes, settings and friend notes on another device', async () => {
    await a.dreams.bulkAdd([
      { text: 'Learn to sail', area: 'adventure', why: 'intrinsic', score: 9, chosen: 1, dateAdded: today() },
      { text: 'Buy a watch', area: 'material', why: 'extrinsic', score: 4, chosen: 0, dateAdded: today(), dateAchieved: today() },
    ])
    await a.plans.add({ moduleId: '01', condition: 'e duminică seara', action: 'scriu 3 visuri', created: today() })
    await a.moduleNotes.put({ moduleId: '01', oneWord: 'curios', takeaways: 'lista nu are termen' })
    await writeSettings({ role: 'both', config: 'pair', paperMode: true, paperCount: 37 }, a)
    await a.friendNotes.add({ moduleId: '01', text: 'ritm lent, ok', created: today() })
    const chosenId = (await a.dreams.where('chosen').equals(1).first())!.id!
    await a.dreamWork.put({ dreamId: chosenId, clarify: { clarity: 'zece zile pe jos prin Apuseni' }, routes: ['vara', 'toamna'], woop: { obstacle: 'telefonul seara' }, updated: today() })
    await a.weekTasks.add({ text: 'ședința de luni', quadrant: 'now', created: today() })

    const file = await exportAll(a)
    expect(isExportFile(file)).toBe(true)
    expect(JSON.parse(JSON.stringify(file))).toEqual(file) // serialisable

    const res = await importAll(JSON.parse(JSON.stringify(file)), b)
    expect(res).toEqual({ dreams: 2, plans: 1 })
    expect(await b.dreams.count()).toBe(2)
    expect((await b.dreams.where('chosen').equals(1).first())?.text).toBe('Learn to sail')
    expect((await readSettings(b)).paperCount).toBe(37)
    expect((await readSettings(b)).config).toBe('pair')
    expect(await b.friendNotes.count()).toBe(1)
    expect((await b.dreamWork.toArray())[0]?.clarify?.clarity).toBe('zece zile pe jos prin Apuseni')
    expect((await b.dreamWork.toArray())[0]?.woop?.obstacle).toBe('telefonul seara')
    expect(await b.weekTasks.count()).toBe(1)
  })

  it('refuses a file that is not an export', async () => {
    await expect(importAll({ foo: 1 } as never, b)).rejects.toThrow()
  })

  it('friend notes can be left out of an export (FR-61)', async () => {
    await a.friendNotes.add({ moduleId: '01', text: 'private', created: today() })
    const file = await exportAll(a, false)
    expect(file.friendNotes).toBeUndefined()
  })
})
