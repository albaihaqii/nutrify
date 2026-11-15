import { id } from '@/locales/id'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { labelClasses } from '@/features/dataset/data/dataset'
import { useModelReport } from '../api/models-queries'
import { CardHint, ModelCard } from './model-card'

function Matrix({ matrix }: { matrix: number[][] }) {
  const peak = Math.max(1, ...matrix.flat())

  return (
    <table className='w-full table-fixed border-separate border-spacing-1.5 text-center'>
      <colgroup>
        <col className='w-20' />
        <col />
        <col />
        <col />
      </colgroup>
      <thead>
        <tr>
          <td aria-hidden='true' />
          {labelClasses.map((predicted) => (
            <th
              key={predicted}
              scope='col'
              className='pb-1 text-[13px] font-semibold text-muted-foreground'
            >
              {id.dataset.labels[predicted]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {labelClasses.map((actual, row) => (
          <tr key={actual}>
            <th
              scope='row'
              className='pr-1 text-left text-[13px] font-semibold text-muted-foreground'
            >
              {id.dataset.labels[actual]}
            </th>
            {labelClasses.map((predicted, column) => {
              const value = matrix[row]?.[column] ?? 0
              const share = value / peak
              return (
                <td
                  key={predicted}
                  aria-label={id.models.confusion.cell
                    .replace('{actual}', id.dataset.labels[actual])
                    .replace('{predicted}', id.dataset.labels[predicted])
                    .replace('{n}', String(value))}
                  className={cn(
                    'h-14 rounded-md text-base font-semibold tabular-nums',
                    share > 0.55
                      ? 'text-primary-foreground'
                      : 'text-foreground',
                    row === column &&
                      'outline-2 -outline-offset-2 outline-foreground'
                  )}
                  style={{
                    backgroundColor: `color-mix(in srgb, var(--primary) ${Math.round(8 + share * 70)}%, var(--card))`,
                  }}
                >
                  {value}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ConfusionCard() {
  const query = useModelReport()

  return (
    <ModelCard
      title={id.models.confusion.title}
      aside={<CardHint>{id.models.confusion.axes}</CardHint>}
    >
      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[236px] w-full' />}
        empty={{
          when: (data) => data.models.length === 0,
          view: <EmptyState title={id.models.empty} />,
        }}
      >
        {(data) => (
          <>
            <Matrix matrix={data.confusion} />
            <p className='mt-3 text-xs text-muted-foreground'>
              {id.models.confusion.legend}
            </p>
          </>
        )}
      </QueryBoundary>
    </ModelCard>
  )
}
