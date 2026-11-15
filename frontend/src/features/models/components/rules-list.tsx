import { id } from '@/locales/id'
import { labelStatus } from '@/features/dataset/data/dataset'
import { type TreeNode } from '../data/models'
import { formatPercent } from '../lib/format'
import { buildRuleLines } from '../lib/tree'

const INDENT_PX = 18

/** The tree as readable if-then lines. */
export function RulesList({ root }: { root: TreeNode }) {
  const lines = buildRuleLines(root)

  return (
    <ul className='flex flex-col gap-1 rounded-lg bg-muted/50 p-4 font-mono text-[13px] leading-6'>
      {lines.map((line, index) => (
        <li key={index} style={{ paddingLeft: line.depth * INDENT_PX }}>
          {line.condition}
          {line.leaf && (
            <>
              {line.condition && ' → '}
              <strong>{id.plantStatus[labelStatus[line.leaf.label]]}</strong>
              <span className='ml-2 text-xs text-muted-foreground'>
                {id.models.tree.leaf
                  .replace('{samples}', String(line.leaf.samples))
                  .replace('{percent}', formatPercent(line.leaf.confidence))}
              </span>
            </>
          )}
        </li>
      ))}
    </ul>
  )
}
