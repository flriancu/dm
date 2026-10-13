import { useEffect, useState } from 'react'
import { vttToParagraphs } from '../lib/vtt'

/** The text of a subtitle file, readable without playing the video. */
export default function Transcript({ src, label }: { src: string; label: string }) {
  const [paras, setParas] = useState<string[] | null>(null)
  useEffect(() => {
    let live = true
    fetch(src)
      .then((r) => (r.ok ? r.text() : ''))
      .then((t) => live && setParas(vttToParagraphs(t)))
      .catch(() => live && setParas([]))
    return () => {
      live = false
    }
  }, [src])
  if (!paras || paras.length === 0) return null
  return (
    <details className="small">
      <summary>{label}</summary>
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </details>
  )
}
