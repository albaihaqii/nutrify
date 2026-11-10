import { type UseQueryResult } from '@tanstack/react-query'
import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { Card } from '@/components/ui/card'
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
import {
  type IdealRanges,
  type SensorRange,
  type SensorRows,
  type SensorSample,
} from '../data/sensors'
import {
  formatSampleTime,
  issuesOf,
  levelBadge,
  levelLabel,
  metricMeta,
} from '../lib/metrics'

const headClass =
  'h-auto px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground'
const cellClass = 'px-3 py-2.5 whitespace-nowrap'
const numberClass = `${cellClass} tabular-nums`
const { columns } = id.sensors.table

function RowStatus({
  sample,
  ideal,
}: {
  sample: SensorSample
  ideal: IdealRanges
}) {
  const [issue, ...others] = issuesOf(sample, ideal)
  const badge = levelBadge[issue ? issue.level : 'ideal']
  const Icon = badge.icon

  return (
    <StatusBadge tone={badge.tone}>
      <Icon aria-hidden='true' />
      {issue
        ? `${id.sensors.metrics[issue.metric].short} ${levelLabel(issue.level)}`
        : levelLabel('ideal')}
      {others.length > 0 && ` +${others.length}`}
    </StatusBadge>
  )
}

function TableSkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden='true'>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className='h-9 w-full' />
      ))}
    </div>
  )
}

function SensorTable({
  data,
  range,
}: {
  data: SensorRows
  range: SensorRange
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead className={headClass}>{columns.time}</TableHead>
          <TableHead className={headClass}>{columns.ph}</TableHead>
          <TableHead className={headClass}>{columns.ec}</TableHead>
          <TableHead className={headClass}>{columns.tds}</TableHead>
          <TableHead className={headClass}>{columns.temperature}</TableHead>
          <TableHead className={headClass}>{columns.status}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row) => (
          <TableRow key={row.at} className='hover:bg-transparent'>
            <TableCell className={numberClass}>
              {formatSampleTime(range, row.at)}
            </TableCell>
            <TableCell className={numberClass}>
              {formatNumber(row.ph, metricMeta.ph.decimals)}
            </TableCell>
            <TableCell className={numberClass}>
              {formatNumber(row.ec, metricMeta.ec.decimals)}
            </TableCell>
            <TableCell className={numberClass}>
              {formatNumber(row.tds, metricMeta.tds.decimals)}
            </TableCell>
            <TableCell className={numberClass}>
              {formatNumber(row.temperature, metricMeta.temperature.decimals)}
            </TableCell>
            <TableCell className={cellClass}>
              <RowStatus sample={row} ideal={data.ideal} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

interface SensorTableCardProps {
  query: UseQueryResult<SensorRows>
  range: SensorRange
}

export function SensorTableCard({ query, range }: SensorTableCardProps) {
  const data = query.data

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{id.sensors.table.title}</h2>
        {data && data.rows.length > 0 && (
          <span className='text-muted-foreground tabular-nums'>
            {id.sensors.table.count
              .replace('{shown}', formatNumber(data.rows.length, 0))
              .replace('{total}', formatNumber(data.total, 0))}
          </span>
        )}
      </div>

      <QueryBoundary
        query={query}
        skeleton={<TableSkeleton />}
        empty={{
          when: (result) => result.rows.length === 0,
          view: <EmptyState title={id.sensors.table.empty} />,
        }}
      >
        {(result) => <SensorTable data={result} range={range} />}
      </QueryBoundary>
    </Card>
  )
}
