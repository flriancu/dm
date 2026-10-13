import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { SECTION_PARAM } from '../lib/paths'

/** Scrolls to the section named in `?s=` once it exists (sections appear after their data loads), on every visit. */
export function useScrollToSection() {
  const { key, search } = useLocation()
  useEffect(() => {
    const id = new URLSearchParams(search).get(SECTION_PARAM)
    if (!id) return
    let frame = 0
    let tries = 0
    const go = () => {
      const el = document.getElementById(id)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        el.focus({ preventScroll: true })
      } else if (++tries < 120) frame = requestAnimationFrame(go)
    }
    go()
    return () => cancelAnimationFrame(frame)
  }, [key, search])
}

/**
 * The row of section links at the top of a long page (see lib/paths for why they use the
 * query, not the hash); it also scrolls to the section the address names.
 */
export default function SectionLinks({ items }: { items: readonly { id: string; label: string }[] }) {
  useScrollToSection()
  return (
    <div className="row small" style={{ gap: '4px 12px' }}>
      {items.map((x) => (
        <Link key={x.id} to={{ search: `?${SECTION_PARAM}=${encodeURIComponent(x.id)}` }} replace>
          {x.label}
        </Link>
      ))}
    </div>
  )
}
