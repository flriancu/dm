/**
 * The address of a section of a long page. The URL hash already holds the route
 * (HashRouter), so a section is named in the query: `/dream?s=woop`. A plain `#woop` link
 * would be read as the route "woop" and land on Home.
 */
export const SECTION_PARAM = 's'

export const sectionPath = (path: string, id: string) => `${path}?${SECTION_PARAM}=${encodeURIComponent(id)}`

/** A printed sheet, optionally for one dream rather than the chosen one (e.g. a dream just released). */
export const sheetPath = (sheet: string, dreamId?: number) =>
  dreamId == null ? `/book/print/${sheet}` : `/book/print/${sheet}?dream=${dreamId}`
