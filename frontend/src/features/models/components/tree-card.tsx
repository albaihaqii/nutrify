import { useState } from 'react'
import { id } from '@/locales/id'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { SegmentedControl } from '@/components/segmented-control'
import { useModelTree } from '../api/models-queries'
import { ModelCard } from './model-card'
import { RulesList } from './rules-list'
import { TreeDiagram } from './tree-diagram'

type TreeView = 'rules' | 'tree'

const VIEW_OPTIONS = [
  { value: 'rules', label: id.models.tree.views.rules },
  { value: 'tree', label: id.models.tree.views.tree },
] as const satisfies ReadonlyArray<{ value: TreeView; label: string }>

export function TreeCard() {
  const query = useModelTree()
  const [view, setView] = useState<TreeView>('rules')
  const hasTree = Boolean(query.data?.root)

  return (
    <ModelCard
      title={id.models.tree.title}
      aside={
        hasTree && (
          <SegmentedControl
            value={view}
            options={VIEW_OPTIONS}
            ariaLabel={id.models.tree.views.group}
            onChange={setView}
          />
        )
      }
    >
      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[236px] w-full' />}
        empty={{
          when: (data) => data.root === null,
          view: <EmptyState title={id.models.empty} />,
        }}
      >
        {(data) => {
          if (data.root === null) return null
          return view === 'rules' ? (
            <RulesList root={data.root} />
          ) : (
            <TreeDiagram root={data.root} />
          )
        }}
      </QueryBoundary>
    </ModelCard>
  )
}
