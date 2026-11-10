import { type PlantStatus } from '@/lib/plant-status'

// Placeholder drawing until real webcam crops are available.
const leafColor: Record<PlantStatus, string> = {
  ok: '#3E9B57',
  n: '#B9B84A',
  fe: '#A9CF86',
  check: '#7C8F80',
}

const leaves = [
  { cx: 34, cy: 48, rx: 22, ry: 12, rotate: -25 },
  { cx: 66, cy: 48, rx: 22, ry: 12, rotate: 25 },
  { cx: 50, cy: 36, rx: 14, ry: 24, rotate: 0 },
]

interface LeafIllustrationProps {
  status: PlantStatus
  /** Draws the dashed segmentation outline over a faded fill. */
  outlined?: boolean
  /** Accessible name. Without it the drawing is hidden from screen readers. */
  label?: string
  className?: string
}

export function LeafIllustration({
  status,
  outlined = false,
  label,
  className,
}: LeafIllustrationProps) {
  const fill = leafColor[status]

  return (
    <svg
      viewBox='0 0 100 80'
      className={className}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {leaves.map((leaf) => (
        <ellipse
          key={`fill-${leaf.cx}-${leaf.cy}`}
          cx={leaf.cx}
          cy={leaf.cy}
          rx={leaf.rx}
          ry={leaf.ry}
          transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
          fill={fill}
          opacity={outlined ? 0.35 : 1}
        />
      ))}
      {outlined &&
        leaves.map((leaf) => (
          <ellipse
            key={`outline-${leaf.cx}-${leaf.cy}`}
            cx={leaf.cx}
            cy={leaf.cy}
            rx={leaf.rx}
            ry={leaf.ry}
            transform={`rotate(${leaf.rotate} ${leaf.cx} ${leaf.cy})`}
            fill='none'
            stroke='#fff'
            strokeWidth={1.2}
            strokeDasharray='3 2'
          />
        ))}
    </svg>
  )
}
