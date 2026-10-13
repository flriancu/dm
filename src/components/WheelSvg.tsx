import { WHEEL_AREAS } from '../db/db'

/** The wheel of life as a radar: one spoke per area, 0 at the centre, 10 at the rim (FR-32). */
export function WheelSvg({ values, size = 260 }: { values: number[]; size?: number }) {
  const n = WHEEL_AREAS.length,
    cx = size / 2,
    cy = size / 2,
    r = size / 2 - 8
  const pt = (i: number, v: number) => {
    const a = (Math.PI * 2 * i) / n - Math.PI / 2
    const d = (r * v) / 10
    return [cx + d * Math.cos(a), cy + d * Math.sin(a)]
  }
  const poly = values.map((v, i) => pt(i, v).join(',')).join(' ')
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width="100%"
      style={{ maxWidth: size, display: 'block', margin: '0 auto' }}
      role="img"
      aria-label="wheel"
    >
      {[2, 4, 6, 8, 10].map((k) => (
        <circle key={k} cx={cx} cy={cy} r={(r * k) / 10} fill="none" stroke="var(--line)" />
      ))}
      {WHEEL_AREAS.map((_, i) => {
        const [x, y] = pt(i, 10)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="var(--line)" />
      })}
      <polygon points={poly} fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeWidth="2" />
      {values.map((v, i) => {
        const [x, y] = pt(i, v)
        return <circle key={i} cx={x} cy={y} r="3" fill="var(--accent)" />
      })}
    </svg>
  )
}
