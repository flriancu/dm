import { describe, it, expect } from 'vitest'
import ro from './locales/ro.json'
import en from './locales/en.json'

describe('locale files', () => {
  it('have identical key sets', () => {
    const a = Object.keys(ro).sort(), b = Object.keys(en).sort()
    expect(b).toEqual(a)
  })
  it('use the same placeholders in both languages', () => {
    for (const k of Object.keys(ro)) {
      const vars = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort()
      expect({ k, v: vars((en as Record<string, string>)[k]) }).toEqual({ k, v: vars((ro as Record<string, string>)[k]) })
    }
  })
  it('contain no empty strings and no cedilla diacritics', () => {
    for (const [k, v] of Object.entries(ro as Record<string, string>)) {
      expect({ k, empty: v.trim() === '' }).toEqual({ k, empty: false })
      expect({ k, cedilla: /[şţŞŢ]/.test(v) }).toEqual({ k, cedilla: false })
    }
  })
})
