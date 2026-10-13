/** A section heading with its in-page anchor (focusable, so a section link moves the keyboard there too) and an optional progress note. */
export default function SectionHead({
  id,
  label,
  title,
  right,
}: {
  id: string
  label: string
  title: string
  right?: string
}) {
  return (
    <>
      <p className="small muted" id={id} tabIndex={-1} style={{ marginBottom: -8, marginTop: 28 }}>
        {label}
      </p>
      <h2 style={{ marginTop: 12 }}>
        {title}
        {right && (
          <span className="small muted" style={{ fontWeight: 400 }}>
            {' '}
            · {right}
          </span>
        )}
      </h2>
    </>
  )
}
