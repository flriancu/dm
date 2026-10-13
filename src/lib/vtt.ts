/** WebVTT subtitles → readable paragraphs, for a transcript under a video. */
export function vttToParagraphs(vtt: string): string[] {
  const lines = vtt.replace(/\r/g, '').split('\n')
  const texts: string[] = []
  let inCue = false
  for (const line of lines) {
    if (/-->/.test(line)) {
      inCue = true
      continue
    }
    if (line.trim() === '') {
      inCue = false
      continue
    }
    if (inCue) texts.push(line.trim())
  }
  // join cue lines into sentences; a new paragraph starts after a sentence end
  const out: string[] = []
  let cur = ''
  for (const t of texts) {
    cur = cur ? `${cur} ${t}` : t
    if (/[.!?]$/.test(t)) {
      out.push(cur)
      cur = ''
    }
  }
  if (cur) out.push(cur)
  return out
}
