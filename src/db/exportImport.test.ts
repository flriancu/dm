import { describe, it, expect, beforeEach } from 'vitest'
import { DreamDB, today } from './db'
import { readSettings, writeSettings } from './settings'
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
      {
        text: 'Buy a watch',
        area: 'material',
        why: 'extrinsic',
        score: 4,
        chosen: 0,
        dateAdded: today(),
        dateAchieved: today(),
      },
    ])
    await a.plans.add({ moduleId: '01', condition: 'e duminică seara', action: 'scriu 3 visuri', created: today() })
    await a.moduleNotes.put({ moduleId: '01', oneWord: 'curios', takeaways: 'lista nu are termen' })
    await writeSettings({ role: 'both', config: 'pair', paperMode: true, paperCount: 37 }, a)
    await a.friendNotes.add({ moduleId: '01', text: 'ritm lent, ok', created: today() })
    const chosenId = (await a.dreams.where('chosen').equals(1).first())!.id!
    await a.dreamWork.put({
      dreamId: chosenId,
      clarify: { clarity: 'zece zile pe jos prin Apuseni' },
      routes: ['vara', 'toamna'],
      woop: { obstacle: 'telefonul seara' },
      habit: { anchor: 'după cafea' },
      habitLog: [{ week: '2026-10-12', done: true, note: '5 din 7' }],
      friends: [{ name: 'Mihai', role: 'ask', ask: 'o oră duminică' }],
      fear: { fear: 'râs' },
      updated: today(),
    })
    await a.weekTasks.add({ text: 'ședința de luni', quadrant: 'now', created: today() })
    await a.journal.add({ date: today(), happened: 'raport refăcut', saboteur: 'judge', friend: 'ia-l pe bucăți' })
    await a.wheels.add({ date: today(), values: [5, 6, 4, 7, 8, 6, 5, 3], swls: [4, 5, 5, 4, 3] })
    await a.reps.add({ date: today(), seconds: 60 })
    await a.strengthUses.add({ date: today(), strength: 'curiozitate', text: 'am sunat un ghid' })
    await a.vision.put({
      id: 'me',
      values: [{ text: 'familia', chosen: true, nonNegotiable: true }],
      valueActs: [],
      letter: { text: 'e marți dimineață', sealed: true, deliverDate: '2027-04-01' },
      worksheet: { matters: 'familia' },
      updated: today(),
    })

    const file = await exportAll(a)
    expect(isExportFile(file)).toBe(true)
    expect(JSON.parse(JSON.stringify(file))).toEqual(file) // serialisable

    const res = await importAll(JSON.parse(JSON.stringify(file)), b)
    expect(res.incoming).toEqual({ dreams: 2, plans: 1 })
    expect(res.dropped).toBe(0)
    expect(await b.dreams.count()).toBe(2)
    expect((await b.dreams.where('chosen').equals(1).first())?.text).toBe('Learn to sail')
    expect((await readSettings(b)).paperCount).toBe(37)
    expect((await readSettings(b)).config).toBe('pair')
    expect(await b.friendNotes.count()).toBe(1)
    expect((await b.dreamWork.toArray())[0]?.clarify?.clarity).toBe('zece zile pe jos prin Apuseni')
    expect((await b.dreamWork.toArray())[0]?.woop?.obstacle).toBe('telefonul seara')
    expect(await b.weekTasks.count()).toBe(1)
    expect((await b.journal.toArray())[0]?.saboteur).toBe('judge')
    expect((await b.wheels.toArray())[0]?.swls).toEqual([4, 5, 5, 4, 3])
    expect(await b.reps.count()).toBe(1)
    expect(await b.strengthUses.count()).toBe(1)
    expect((await b.vision.get('me'))?.letter?.deliverDate).toBe('2027-04-01')
    expect((await b.dreamWork.toArray())[0]?.friends?.[0]?.name).toBe('Mihai')
    expect((await b.dreamWork.toArray())[0]?.habitLog?.[0]?.done).toBe(true)
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
