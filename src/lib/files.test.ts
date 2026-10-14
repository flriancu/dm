import { describe, it, expect, afterEach, vi } from 'vitest'
import { shareText } from './files'

const real = Object.getOwnPropertyDescriptor(globalThis, 'navigator')
const sheet = (share: () => Promise<void>, canShare = () => true) =>
  Object.defineProperty(globalThis, 'navigator', { value: { share, canShare }, configurable: true })
afterEach(() => {
  vi.useRealTimers()
  if (real) Object.defineProperty(globalThis, 'navigator', real)
})

describe('the share sheet', () => {
  it('reports a cancel as cancelled and any other failure as unsupported (the caller downloads instead)', async () => {
    sheet(() => Promise.reject(new DOMException('closed', 'AbortError')))
    expect(await shareText('a.json', '{}', 'application/json', 't')).toBe('cancelled')
    sheet(() => Promise.reject(new DOMException('no', 'NotAllowedError')))
    expect(await shareText('a.json', '{}', 'application/json', 't')).toBe('unsupported')
    sheet(() => Promise.reject(new TypeError('bad data')))
    expect(await shareText('a.json', '{}', 'application/json', 't')).toBe('unsupported')
  })

  it('a second tap while a sheet is open does nothing; once it closes, sharing works again', async () => {
    let close = () => {}
    sheet(() => new Promise<void>((r) => (close = r)))
    const first = shareText('a.md', '# x', 'text/markdown', 't')
    expect(await shareText('a.md', '# x', 'text/markdown', 't')).toBe('busy')
    close()
    expect(await first).toBe('shared')
    sheet(() => Promise.resolve())
    expect(await shareText('a.md', '# x', 'text/markdown', 't')).toBe('shared')
  })

  it('a sheet still open after the minute: the next tap is busy, never a download', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    let closeFirst = () => {}
    sheet(() => new Promise<void>((r) => (closeFirst = r)))
    const first = shareText('a.md', '# x', 'text/markdown', 't')
    vi.advanceTimersByTime(61_000)
    sheet(() => Promise.reject(new DOMException('a share is already in progress', 'InvalidStateError')))
    expect(await shareText('a.md', '# x', 'text/markdown', 't')).toBe('busy')

    // a second sheet opened after the minute: the first one closing does not free it
    let closeSecond = () => {}
    sheet(() => new Promise<void>((r) => (closeSecond = r)))
    vi.advanceTimersByTime(61_000)
    const second = shareText('a.md', '# x', 'text/markdown', 't')
    closeFirst()
    await first
    expect(await shareText('a.md', '# x', 'text/markdown', 't')).toBe('busy')
    closeSecond()
    expect(await second).toBe('shared')
  })

  it('no sheet, or no type it accepts: unsupported', async () => {
    Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
    expect(await shareText('a.md', 'x', 'text/markdown', 't')).toBe('unsupported')
    sheet(
      () => Promise.resolve(),
      () => false,
    )
    expect(await shareText('a.md', 'x', 'text/markdown', 't')).toBe('unsupported')
  })
})
