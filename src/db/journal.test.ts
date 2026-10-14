import { describe, it, expect, beforeEach, vi } from 'vitest'
import { db } from './db'
import { addDream, saveDreamWork } from './dreams'
import { addWeekTask } from './week'
import { fields, replayUnsaved } from './fields'
import { clearUnsaved, keepUnsaved, orphanedEntries, replayWhenTabsClose } from './journal'
import { getVision } from './vision'

const KEY = 'dream-course:unsaved'
const left = async () => (await orphanedEntries()).map(([k]) => k)

beforeEach(async () => {
  clearUnsaved()
  await db.delete()
  await db.open()
})

describe('the unsaved-text journal', () => {
  it('writes text a page left unsaved, through the same mutation, at the next start', async () => {
    const id = (await addDream('vis')) as number
    keepUnsaved(fields.dreamWork(id, 'woop', 'obstacle').key, { text: 'telefonul seara', base: '' })
    keepUnsaved(fields.route(id, 2).key, { text: 'cu trenul', base: '' })
    keepUnsaved(fields.moduleNote('03', 'takeaways').key, { text: 'răbdare', base: '' })
    keepUnsaved(fields.vision('letter', 'text').key, { text: 'Dragă eu', base: '' })
    await replayUnsaved()
    const w = await db.dreamWork.get(id)
    expect(w?.woop?.obstacle).toBe('telefonul seara')
    expect(w?.routes).toEqual(['', '', 'cu trenul'])
    expect((await db.moduleNotes.get('03'))?.takeaways).toBe('răbdare')
    expect((await getVision())?.letter?.text).toBe('Dragă eu')
    expect(await left()).toEqual([])
  })

  it('never writes over a field that changed since the edit began (a later edit, another tab)', async () => {
    const id = (await addDream('vis')) as number
    await saveDreamWork(id, { clarify: { clarity: 'NOU, scris după' } })
    keepUnsaved(fields.dreamWork(id, 'clarify', 'clarity').key, { text: 'VECHI, nesalvat', base: '' })
    await replayUnsaved()
    expect((await db.dreamWork.get(id))?.clarify?.clarity).toBe('NOU, scris după')
    expect(await left()).toEqual([]) // stale entries do not linger
  })

  it("writes over the box's own save that landed just before the page went (text typed after it)", async () => {
    const id = (await addDream('vis')) as number
    await saveDreamWork(id, { fear: { fear: 'a' } }) // the save of "a" committed; the page never heard back
    keepUnsaved(fields.dreamWork(id, 'fear', 'fear').key, { text: 'ab', base: '', sent: 'a' })
    await replayUnsaved()
    expect((await db.dreamWork.get(id))?.fear?.fear).toBe('ab')
  })

  it('keeps an entry whose write fails, for the next start', async () => {
    const id = (await addDream('vis')) as number
    const key = fields.route(id, 0).key
    keepUnsaved(key, { text: 'pe jos', base: '' })
    const hook = (_: unknown, __: unknown, tx: { abort: () => void }) => tx.abort() // storage refuses the write
    db.dreamWork.hook('creating', hook)
    await replayUnsaved()
    db.dreamWork.hook('creating').unsubscribe(hook)
    expect(await left()).toEqual([key])
    await replayUnsaved()
    expect((await db.dreamWork.get(id))?.routes?.[0]).toBe('pe jos')
  })

  it('drops entries it cannot read: unknown kinds, broken keys, malformed entries', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        '["nope",1]': { text: 'x', base: '' },
        '{bad': { text: 'y', base: '' },
        '["vision","worksheet","now"]': { text: 42 },
      }),
    )
    await replayUnsaved()
    expect(await left()).toEqual([])
  })

  it('never creates a row or a slot that is not there: a deleted dream or task, a module the course lacks, an index out of range', async () => {
    const id = (await addDream('vis')) as number
    const task = (await addWeekTask('scris')) as number
    await db.dreams.delete(id)
    await db.weekTasks.delete(task)
    keepUnsaved(fields.route(id, 0).key, { text: 'fantomă', base: '' })
    keepUnsaved(fields.taskWhen(task).key, { text: 'luni', base: '' })
    keepUnsaved(fields.value(99).key, { text: 'prea departe', base: '' })
    keepUnsaved(fields.moduleNote('../x', 'takeaways').key, { text: 'nu', base: '' })
    keepUnsaved(fields.moduleNote('99', 'takeaways').key, { text: 'modul inexistent', base: '' })
    keepUnsaved(JSON.stringify(['vision', '__proto__', 'x']), { text: 'nu', base: '' })
    await replayUnsaved()
    expect(await db.dreamWork.count()).toBe(0)
    expect(await db.weekTasks.count()).toBe(0)
    expect(await db.moduleNotes.count()).toBe(0)
    expect(await getVision()).toBeNull()
    expect(await left()).toEqual([])
  })

  it('leaves the entries of a tab still open to that tab (it is still saving them)', async () => {
    const id = (await addDream('vis')) as number
    const mine = fields.route(id, 0).key
    const theirs = fields.route(id, 1).key
    localStorage.setItem(
      KEY,
      JSON.stringify({ [mine]: { text: 'al meu', base: '' }, [theirs]: { text: 'al lor', base: '', tab: 'other' } }),
    )
    let release = () => {}
    const held = new Promise<void>((r) => (release = r))
    const got = new Promise<void>((r) => void navigator.locks.request('dream-course:tab:other', () => (r(), held)))
    await got
    await replayUnsaved()
    expect((await db.dreamWork.get(id))?.routes).toEqual(['al meu', '', ''])
    expect(JSON.parse(localStorage.getItem(KEY)!)).toHaveProperty([theirs])
    release()
    await new Promise((r) => setTimeout(r))
    await replayUnsaved() // that tab is gone now without saving: its text is written
    expect((await db.dreamWork.get(id))?.routes).toEqual(['al meu', 'al lor', ''])
  })

  it('writes the text of another open tab as soon as that tab closes, while this tab stays open', async () => {
    const id = (await addDream('vis')) as number
    const key = fields.route(id, 0).key
    localStorage.setItem(KEY, JSON.stringify({ [key]: { text: 'din tabul închis', base: '', tab: 'closing' } }))
    let close = () => {}
    const open = new Promise<void>((r) => (close = r))
    await new Promise<void>((r) => void navigator.locks.request('dream-course:tab:closing', () => (r(), open)))
    await replayUnsaved() // this tab's start: the other tab is still open
    const written = new Promise<void>((r) => replayWhenTabsClose(() => replayUnsaved().then(r)))
    expect((await db.dreamWork.get(id))?.routes).toBeUndefined()
    close()
    await written
    expect((await db.dreamWork.get(id))?.routes?.[0]).toBe('din tabul închis')
    expect(await left()).toEqual([])
  })

  it('removes the older entry of a field when the newer text cannot be kept (storage full)', async () => {
    const key = fields.strength(0).key
    keepUnsaved(key, { text: 'răbdare', base: '' })
    const full = vi.spyOn(localStorage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    keepUnsaved(key, { text: 'răbdare și curaj', base: '' })
    full.mockRestore()
    expect(await left()).toEqual([]) // the old text must not be replayed over what the box saves next
  })
})
