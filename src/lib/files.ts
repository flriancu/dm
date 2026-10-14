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

export type ShareResult = 'shared' | 'cancelled' | 'unsupported'

export async function shareText(name: string, text: string, type: string, title: string): Promise<ShareResult> {
  const n = nav()
  if (!n?.share || !n.canShare) return 'unsupported'
  const file = shareableFile(name, text, type, (f) => {
    try {
      return n.canShare!({ files: [f] })
    } catch {
      return false
    }
  })
  if (!file) return 'unsupported'
  try {
    await n.share({ files: [file], title })
    return 'shared'
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    throw e
  }
}
