import { id } from '@/locales/id'
import { type PlantStatus } from '@/lib/plant-status'
import { labelStatus } from '@/features/dataset/data/dataset'
import { type TreeNode } from '../data/models'
import { formatPercent } from '../lib/format'
import {
  NODE_HEIGHT,
  NODE_WIDTH,
  layoutTree,
  splitName,
  type DiagramEdge,
} from '../lib/tree'

const LEAF_CLASS: Record<PlantStatus, string> = {
  ok: 'fill-emerald-50 stroke-emerald-600 dark:fill-emerald-950 dark:stroke-emerald-500',
  n: 'fill-amber-50 stroke-amber-600 dark:fill-amber-950 dark:stroke-amber-500',
  fe: 'fill-sky-50 stroke-sky-600 dark:fill-sky-950 dark:stroke-sky-500',
  check: 'fill-muted stroke-border',
}

function edgePath({ fromX, fromY, toX, toY }: DiagramEdge): string {
  const middle = (fromY + toY) / 2
  return `M ${fromX} ${fromY} C ${fromX} ${middle}, ${toX} ${middle}, ${toX} ${toY}`
}

/** The tree drawn as boxes and lines. It scrolls sideways when it is wider than the card. */
export function TreeDiagram({ root }: { root: TreeNode }) {
  const diagram = layoutTree(root)

  return (
    <div className='overflow-x-auto rounded-lg bg-muted/50 p-2'>
      <svg
        role='img'
        aria-label={id.models.tree.diagram}
        viewBox={`0 0 ${diagram.width} ${diagram.height}`}
        width={diagram.width}
        height={diagram.height}
        className='mx-auto block max-w-none'
      >
        {diagram.edges.map((edge) => (
          <path
            key={edge.key}
            d={edgePath(edge)}
            className='fill-none stroke-muted-foreground/40'
            strokeWidth={1.5}
          />
        ))}

        {diagram.edges.map((edge) => (
          <text
            key={`${edge.key}-text`}
            x={(edge.fromX + edge.toX) / 2}
            y={(edge.fromY + edge.toY) / 2 + 4}
            textAnchor='middle'
            strokeWidth={4}
            strokeLinejoin='round'
            paintOrder='stroke'
            className='fill-muted-foreground stroke-muted text-[11px]'
          >
            {edge.text}
          </text>
        ))}

        {diagram.nodes.map(({ key, x, y, node }) => {
          const left = x - NODE_WIDTH / 2
          const top = y - NODE_HEIGHT / 2

          if (node.kind === 'split') {
            return (
              <g key={key}>
                <rect
                  x={left}
                  y={top}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={8}
                  className='fill-card stroke-border'
                  strokeWidth={1.5}
                />
                <text
                  x={x}
                  y={y + 4}
                  textAnchor='middle'
                  className='fill-foreground text-[13px] font-semibold'
                >
                  {splitName(node)}
                </text>
              </g>
            )
          }

          return (
            <g key={key}>
              <rect
                x={left}
                y={top}
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx={8}
                className={LEAF_CLASS[labelStatus[node.label]]}
                strokeWidth={1.5}
              />
              <text
                x={x}
                y={y - 3}
                textAnchor='middle'
                className='fill-foreground text-xs font-semibold'
              >
                {id.plantStatus[labelStatus[node.label]]}
              </text>
              <text
                x={x}
                y={y + 12}
                textAnchor='middle'
                className='fill-muted-foreground text-[11px]'
              >
                {id.models.tree.leaf
                  .replace('{samples}', String(node.samples))
                  .replace('{percent}', formatPercent(node.confidence))}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
