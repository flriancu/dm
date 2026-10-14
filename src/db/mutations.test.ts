import { describe, it, expect, beforeEach } from 'vitest'
import { db, today, MAX_CRITERIA, TEXT_LONG } from './db'
import { calendarUid, readSettings, writeSettings } from './settings'
import {
  addDream,
  chooseDream,
  releaseDream,
  setPaperChosen,
  setFriend,
  setRoute,
  setHabitWeek,
  setLetgoSign,
  saveDreamWork,
  addCriterion,
  removeCriterion,
} from './dreams'
import { setValueItem, addValueAct, logCheckin, openLetter, startNewLetter, saveVision, getVision } from './vision'
import { changeRoleConfig, markMeetingHeld, unmarkMeetingHeld } from './notes'
import { moveToCalendar, putInQuadrant, addWeekTask } from './week'
import { saveWheel } from './calm'

/**
 * Writes that used to race: each test fires the second write before the first settles, the
 * way a quick tap after typing, a double click or a second tab does, and checks nothing is lost.
 */
beforeEach(async () => {
  await db.delete()
  await db.open()
})

const work = async (id: number) => (await db.dreamWork.get(id))!

describe('lists inside a document', () => {
  it('a typed name and a quick tap on its role chip both survive', async () => {
    const id = (await addDream('d')) as number
    await Promise.all([setFriend(id, 0, { name: 'Ana' }), setFriend(id, 0, { role: 'friend' })])
    expect((await work(id)).friends?.[0]).toEqual({ name: 'Ana', role: 'friend' })
  })
  it('routes, habit weeks and letting-go signs edited at once keep every edit', async () => {
    const id = (await addDream('d')) as number
    await Promise.all([
      setRoute(id, 0, 'pe jos'),
      setRoute(id, 2, 'cu trenul'),
      setHabitWeek(id, '2026-10-12', { note: 'luni' }),
      setHabitWeek(id, '2026-10-12', { done: true }),
      setHabitWeek(id, '2026-10-05', { done: true }),
      setLetgoSign(id, 'sleep', true),
      setLetgoSign(id, 'stalled', true),
      saveDreamWork(id, { clarify: { clarity: 'c' } }),
    ])
    const w = await work(id)
    expect(w.routes).toEqual(['pe jos', '', 'cu trenul'])
    expect(w.habitLog).toEqual(
      expect.arrayContaining([
        { week: '2026-10-12', note: 'luni', done: true },
        { week: '2026-10-05', done: true },
      ]),
    )
    expect(w.letgo?.signs?.sort()).toEqual(['sleep', 'stalled'])
    expect(w.clarify?.clarity).toBe('c')
  })
  it('two values typed in two tabs and a star tapped meanwhile all survive', async () => {
    await Promise.all([
      setValueItem(0, { text: 'libertate' }),
      setValueItem(1, { text: 'familie' }),
      setValueItem(0, { chosen: true }),
    ])
    const v = (await db.vision.get('me'))!
    expect(v.values[0]).toMatchObject({ text: 'libertate', chosen: true })
    expect(v.values[1].text).toBe('familie')
  })
  it('never more than five chosen values, however fast the taps', async () => {
    await Promise.all(Array.from({ length: 8 }, (_, i) => setValueItem(i, { text: `v${i}`, chosen: true })))
    const v = (await db.vision.get('me'))!
    expect(v.values.filter((x) => x.chosen)).toHaveLength(5)
  })
  it('two acts logged at once are both kept; two check-ins the same day become one with both notes', async () => {
    await saveVision({ checkin: { everyMonths: 3, next: today() } })
    await Promise.all([
      addValueAct('a', 'one'),
      addValueAct('a', 'two'),
      logCheckin('x'),
      logCheckin('y'),
      logCheckin(''),
    ])
    const v = (await db.vision.get('me'))!
    expect(v.valueActs.map((a) => a.text).sort()).toEqual(['one', 'two'])
    expect(v.checkin?.log).toHaveLength(1)
    expect(v.checkin!.log![0].note.split('\n').sort()).toEqual(['x', 'y'])
  })
  it('a second wheel saved the same day replaces the first', async () => {
    await Promise.all([
      saveWheel([1, 1, 1, 1, 1, 1, 1, 1], [1, 1, 1, 1, 1]),
      saveWheel([2, 2, 2, 2, 2, 2, 2, 2], [2, 2, 2, 2, 2]),
    ])
    const all = await db.wheels.toArray()
    expect(all).toHaveLength(1)
    expect(all[0].values[0]).toBe(2)
  })
})

describe('rating criteria', () => {
  it('at most twenty, and removing by position never removes a different one', async () => {
    await Promise.all(Array.from({ length: 25 }, (_, i) => addCriterion(`c${i}`)))
    expect((await readSettings()).criteria).toHaveLength(MAX_CRITERIA)
    await writeSettings({ criteria: ['A', 'B', 'C'] })
    await Promise.all([removeCriterion(0, 'A'), removeCriterion(0, 'A')]) // a quick second tap on the same ✕
    expect((await readSettings()).criteria).toEqual(['B', 'C'])
  })
})

describe('the chosen dream', () => {
  it('a dream released in another tab cannot be chosen from a stale list', async () => {
    const a = (await addDream('a')) as number
    const dream = (await db.dreams.get(a))!
    await releaseDream(dream)
    await chooseDream(dream) // the stale tab still shows it as available
    expect((await db.dreams.get(a))!.chosen).toBe(0)
  })
  it('two tabs choosing different dreams leave exactly one chosen', async () => {
    const [a, b] = [(await addDream('a')) as number, (await addDream('b')) as number]
    await Promise.all([chooseDream((await db.dreams.get(a))!), chooseDream((await db.dreams.get(b))!)])
    expect(await db.dreams.where('chosen').equals(1).count()).toBe(1)
  })
  it('paper mode: editing renames, emptying un-chooses and keeps the old dream, typing again adds a new one', async () => {
    await setPaperChosen('zece ')
    await setPaperChosen('zece zile')
    expect((await db.dreams.toArray()).map((d) => [d.text, d.chosen])).toEqual([['zece zile', 1]])
    await setPaperChosen('')
    await setPaperChosen('alt vis')
    expect((await db.dreams.toArray()).map((d) => [d.text, d.chosen])).toEqual([
      ['zece zile', 0],
      ['alt vis', 1],
    ])
  })
})

describe('meetings and the pair lead', () => {
  const MEETINGS = ['01', '02', '03']
  const pair = () => writeSettings({ role: 'both', config: 'pair', friendToday: true })
  it('a double click on "meeting held" keeps the first date and passes the lead once', async () => {
    await pair()
    await Promise.all([markMeetingHeld('01', MEETINGS), markMeetingHeld('01', MEETINGS)])
    expect((await readSettings()).friendToday).toBe(false)
    expect((await db.moduleNotes.get('01'))!.completedOn).toBe(today())
    await markMeetingHeld('01', MEETINGS) // later click: nothing changes
    expect((await readSettings()).friendToday).toBe(false)
  })
  it('the lead passes only for the next meeting, only in a pair, and comes back on undo', async () => {
    await pair()
    await markMeetingHeld('03', MEETINGS) // out of order: not the next meeting
    expect((await readSettings()).friendToday).toBe(true)
    await markMeetingHeld('01', MEETINGS)
    expect((await readSettings()).friendToday).toBe(false)
    await unmarkMeetingHeld('01')
    expect((await readSettings()).friendToday).toBe(true)
    expect((await db.moduleNotes.get('01'))!.completedOn).toBeUndefined()
    await unmarkMeetingHeld('03') // it never passed the lead, so undoing it leaves the lead alone
    expect((await readSettings()).friendToday).toBe(true)
    await writeSettings({ role: 'dreamer', config: 'solo' })
    await markMeetingHeld('01', MEETINGS)
    expect((await readSettings()).friendToday).toBe(false) // outside a peer pair there is no turn to lead
  })
  it('two tabs marking two meetings at once pass the lead once, for the one that was next', async () => {
    await pair()
    await Promise.all([markMeetingHeld('02', MEETINGS), markMeetingHeld('01', MEETINGS)])
    const notes = await db.moduleNotes.toArray()
    expect(notes.filter((n) => n.passedLead).map((n) => n.moduleId)).toHaveLength(1)
    expect((await readSettings()).friendToday).toBe(false)
  })
})

describe('letter and check-in', () => {
  it('reading the letter marks it once; a new letter keeps the old one', async () => {
    await saveVision({ letter: { text: 'dragă eu', sealed: true, deliverDate: '2026-01-01' } })
    await Promise.all([openLetter(), openLetter()])
    const read = (await db.vision.get('me'))!.letter!
    expect(read).toMatchObject({ opened: true, openedOn: today() })
    await startNewLetter()
    const v = (await db.vision.get('me'))!
    expect(v.letter).toBeUndefined()
    expect(v.pastLetters?.[0]?.text).toBe('dragă eu')
  })
})

describe('the week', () => {
  it('only a task in "plan" stays marked for the calendar', async () => {
    const a = (await addWeekTask('a')) as number
    const b = (await addWeekTask('b')) as number
    await Promise.all([moveToCalendar((await db.weekTasks.get(a))!), moveToCalendar((await db.weekTasks.get(b))!)])
    expect(await db.weekTasks.where('moved').equals(1).count()).toBe(1)
    const moved = (await db.weekTasks.where('moved').equals(1).first())!
    await putInQuadrant(moved, 'drop')
    expect(await db.weekTasks.where('moved').equals(1).count()).toBe(0)
  })
})

describe('the pair lead and a change of arrangement', () => {
  it('a change of role or configuration clears the lead and the record of who passed it', async () => {
    await writeSettings({ role: 'both', config: 'pair', friendToday: false })
    await markMeetingHeld('01', ['01', '02'])
    expect((await readSettings()).friendToday).toBe(true)
    await changeRoleConfig('both', 'group')
    expect((await readSettings()).friendToday).toBe(false)
    await unmarkMeetingHeld('01') // the lead was passed in the old pair: nothing comes back
    expect((await readSettings()).friendToday).toBe(false)
    await changeRoleConfig('both', 'pair')
    expect((await readSettings()).friendToday).toBe(false)
  })
  it('the lead only counts in a peer pair, whatever is stored', async () => {
    await writeSettings({ role: 'dreamer', config: 'solo', friendToday: true })
    expect((await readSettings()).friendToday).toBe(false)
  })
})

describe('calendar ids', () => {
  it('are the same on every export from this device, and different on another', async () => {
    const a = await calendarUid('meeting-03')
    expect(await calendarUid('meeting-03')).toBe(a)
    expect(a).toMatch(/^meeting-03-[0-9a-f]{24}$/)
    await writeSettings({ calendarId: undefined })
    expect(await calendarUid('meeting-03')).not.toBe(a)
  })
})

describe('check-in notes', () => {
  it('a note merged on the same day never ends in half a character', async () => {
    await saveVision({ checkin: { everyMonths: 3, next: today() } })
    await logCheckin('a'.repeat(TEXT_LONG - 1))
    await logCheckin(String.fromCodePoint(0x1f600))
    const note = (await getVision())!.checkin!.log!.at(-1)!.note
    const last = note.charCodeAt(note.length - 1)
    expect(note.length).toBeLessThanOrEqual(TEXT_LONG)
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false) // no lone high surrogate at the cut
  })
})
