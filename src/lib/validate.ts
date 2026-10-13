import { isIsoDate } from './dates'

/**
 * Small validators for data that comes from outside the running app: a backup file, or a
 * row written by an older version. A validator returns the cleaned value, or undefined
 * when the input cannot be used. Pure: no React, no database.
 */
export type Validator<T> = (x: unknown) => T | undefined

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

/** A string, cut to `max` UTF-16 units without splitting a surrogate pair. */
export const text =
  (max: number): Validator<string> =>
  (x) => {
    if (typeof x !== 'string') return undefined
    if (x.length <= max) return x
    const cut = /[\uD800-\uDBFF]/.test(x[max - 1]) ? max - 1 : max
    return x.slice(0, cut)
  }

export const oneOf =
  <T extends string | number>(list: readonly T[]): Validator<T> =>
  (x) =>
    (list as readonly unknown[]).includes(x) ? (x as T) : undefined

export const bool: Validator<boolean> = (x) => (typeof x === 'boolean' ? x : undefined)

/** The 0/1 flags the tables index on; true/false and '1'/'0' are read as the same flag. */
export const flag: Validator<0 | 1> = (x) =>
  x === 1 || x === true || x === '1' ? 1 : x === 0 || x === false || x === '0' ? 0 : undefined

export const int =
  (min: number, max: number): Validator<number> =>
  (x) =>
    typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max ? x : undefined

/** Any finite number, rounded and brought into [min, max]. */
export const clampInt =
  (min: number, max: number): Validator<number> =>
  (x) =>
    typeof x === 'number' && Number.isFinite(x) ? Math.min(max, Math.max(min, Math.round(x))) : undefined

export const isoDate: Validator<string> = (x) => (isIsoDate(x) ? x : undefined)

/** Uses `fallback()` when the value is missing or unusable. */
export const orElse =
  <T>(v: Validator<T>, fallback: () => T): Validator<T> =>
  (x) =>
    v(x) ?? fallback()

/** The valid items of an array, at most `max` of them, optionally without repeats of `key`. */
export const list =
  <T>(item: Validator<T>, max: number, key?: (t: T) => unknown): Validator<T[]> =>
  (x) => {
    if (!Array.isArray(x)) return undefined
    const out: T[] = []
    const seen = new Set<unknown>()
    for (const raw of x) {
      const v = item(raw)
      if (v === undefined) continue
      if (key) {
        const k = key(v)
        if (seen.has(k)) continue
        seen.add(k)
      }
      out.push(v)
      if (out.length >= max) break
    }
    return out
  }

/**
 * A list where position matters (row i is slot i): an unusable item becomes `empty()`
 * instead of shifting the rows after it; items past `n` are dropped.
 */
export const slots =
  <T>(item: Validator<T>, n: number, empty: () => T): Validator<T[]> =>
  (x) =>
    Array.isArray(x) ? x.slice(0, n).map((r) => item(r) ?? empty()) : undefined

type Shape = Record<string, Validator<unknown>>
export type Shaped<S extends Shape> = { [K in keyof S]?: S[K] extends Validator<infer T> ? T : never }

/**
 * An object holding only the keys of `shape`, each validated; unknown keys are dropped (so
 * a `__proto__` or `constructor` key never reaches the app). Undefined when a `required`
 * key is missing or invalid.
 */
export const fields =
  <S extends Shape>(shape: S, required: readonly (keyof S)[] = []): Validator<Shaped<S>> =>
  (x) => {
    if (!isRecord(x)) return undefined
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(shape)) {
      const v = Object.hasOwn(x, k) ? shape[k](x[k]) : shape[k](undefined)
      if (v !== undefined) out[k] = v
    }
    return required.every((k) => k in out) ? (out as Shaped<S>) : undefined
  }
