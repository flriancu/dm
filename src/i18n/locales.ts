/**
 * The interface languages, apart from the React provider, so the data layer can check a
 * stored language without importing UI code. Adding a language = add it here and add its
 * JSON file next to this one.
 */
export const UI_LOCALES = ['ro', 'en'] as const
export type UiLocale = (typeof UI_LOCALES)[number]
