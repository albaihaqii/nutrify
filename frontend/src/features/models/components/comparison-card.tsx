import { id } from '@/locales/id'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { useModelReport } from '../api/models-queries'
import { metricKeys, type MetricKey, type ModelReport } from '../data/models'
import { formatMetric, formatTrainedDate } from '../lib/format'
import { CardHint, ModelCard } from './model-card'

/** Hundredths, so a tie is judged on the 2 decimals that are shown. */
const hundredths = (value: number) => Math.round(value * 100)

function bestScores(report: ModelReport): Record<MetricKey, number> {
  const best = { accuracy: 0, precision: 0, recall: 0, f1: 0 }
  for (const model of report.models) {
    for (const key of metricKeys) {
      best[key] = Math.max(best[key], hundredths(model.metrics[key]))
    }
  }
  return best
}

function ComparisonTable({ report }: { report: ModelReport }) {
  const best = bestScores(report)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{id.models.comparison.columns.model}</TableHead>
          <TableHead>{id.models.comparison.columns.role}</TableHead>
          {metricKeys.map((key) => (
            <TableHead key={key} className='text-right'>
              {id.models.comparison.columns[key]}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.models.map((model) => {
          const primary = model.id === 'c45'
          return (
            <TableRow key={model.id}>
              <TableCell className='font-semibold'>
                {id.models.names[model.id]}
              </TableCell>
              <TableCell>
                <StatusBadge tone={primary ? 'ok' : 'check'} dashed={!primary}>
                  {primary
                    ? id.models.roles.primary
                    : id.models.roles.comparator}
                </StatusBadge>
              </TableCell>
              {metricKeys.map((key) => {
                const value = model.metrics[key]
                const isBest = hundredths(value) === best[key]
                return (
                  <TableCell
                    key={key}
                    className={cn(
                      'text-right tabular-nums',
                      isBest && 'font-semibold'
                    )}
                  >
                    {formatMetric(value)}
                  </TableCell>
                )
              })}
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

export function ComparisonCard() {
  const query = useModelReport()
  const report = query.data
  const trained = report !== undefined && report.models.length > 0

  return (
    <ModelCard
      title={id.models.comparison.title}
      aside={
        trained && (
          <CardHint>
            {id.models.comparison.meta
              .replace('{date}', formatTrainedDate(report.trainedAt))
              .replace('{n}', String(report.testSize))}
          </CardHint>
        )
      }
    >
      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[212px] w-full' />}
        empty={{
          when: (data) => data.models.length === 0,
          view: <EmptyState title={id.models.empty} />,
        }}
      >
        {(data) => <ComparisonTable report={data} />}
      </QueryBoundary>
    </ModelCard>
  )
}
