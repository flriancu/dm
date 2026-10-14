/**
 * Getting a file out of the app: a download, or the device's share sheet (Google Drive,
 * iCloud Files, OneDrive, e-mail, a messaging app…). The person picks where it goes; the
 * app never talks to a cloud service itself (NFR-01).
 */

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function downloadText(name: string, text: string, type = 'text/calendar') {
  downloadBlob(name, new Blob([text], { type }))
}

type ShareNavigator = Navigator & {
  canShare?: (data: { files?: File[] }) => boolean
  share?: (data: { files?: File[]; title?: string }) => Promise<void>
}
const nav = () => (typeof navigator === 'undefined' ? undefined : (navigator as ShareNavigator))

/** Whether this browser can hand a file to the share sheet (phones, and some desktops). */
export function canShareFiles(): boolean {
  const n = nav()
  if (!n?.share || !n.canShare) return false
  try {
    return n.canShare({ files: [new File(['x'], 'x.txt', { type: 'text/plain' })] })
  } catch {
    return false
  }
}

/**
 * The share sheet accepts only some file types; Chrome, for one, refuses .json and .md.
 * Such a file is offered as plain text with ".txt" added, which every target accepts and
 * which the app's import also reads.
 */
export function shareableFile(name: string, text: string, type: string, accepts: (f: File) => boolean): File | null {
  const original = new File([text], name, { type })
  if (accepts(original)) return original
  const plain = new File([text], name.endsWith('.txt') ? name : `${name}.txt`, { type: 'text/plain' })
  return accepts(plain) ? plain : null
}

/**
 * shared · cancelled (the person closed the sheet) · busy (a sheet is already open: a second tap
 * does nothing) · unsupported (no sheet, the type is refused, or the sheet failed: the caller
 * downloads the file instead, so the person always gets it).
 */
export type ShareResult = 'shared' | 'cancelled' | 'busy' | 'unsupported'

/**
 * The open sheet: when it was asked for, and which call asked. A sheet that never answers
 * counts as gone after a minute; if it is in fact still open, the browser refuses the next
 * one (InvalidStateError), which is "busy" as well, never a reason to download.
 */
let sheet = { since: 0, call: 0 }
const SHEET_TIMEOUT_MS = 60_000

export async function shareText(name: string, text: string, type: string, title: string): Promise<ShareResult> {
  const n = nav()
  if (!n?.share || !n.canShare) return 'unsupported'
  if (Date.now() - sheet.since < SHEET_TIMEOUT_MS) return 'busy'
  const file = shareableFile(name, text, type, (f) => {
    try {
      return n.canShare!({ files: [f] })
    } catch {
      return false
    }
  })
  if (!file) return 'unsupported'
  const call = sheet.call + 1
  sheet = { since: Date.now(), call }
  try {
    await n.share({ files: [file], title })
    return 'shared'
  } catch (e) {
    const why = e instanceof DOMException ? e.name : ''
    return why === 'AbortError' ? 'cancelled' : why === 'InvalidStateError' ? 'busy' : 'unsupported'
  } finally {
    if (sheet.call === call) sheet = { since: 0, call } // only this call's sheet: a later one may still be open
  }
}
