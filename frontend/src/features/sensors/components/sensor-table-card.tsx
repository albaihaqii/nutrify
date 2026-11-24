import { useState } from 'react'
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
import { PaginationBar } from '@/components/pagination-bar'
import { QueryBoundary, type BoundaryQuery } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import {
  type IdealRanges,
  type SensorRange,
  type SensorRows,
  type SensorSample,
} from '../data/sensors'
import {
  formatRowSpan,
  formatRowTime,
  issuesOf,
  levelBadge,
  levelLabel,
  metricMeta,
} from '../lib/metrics'

const headClass =
  'h-auto px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground'
const cellClass = 'px-3 py-2.5 whitespace-nowrap'
const numberClass = `${cellClass} tabular-nums`
const PAGE_SIZE = 10
const { columns } = id.sensors.table

function RowStatus({
  sample,
  ideal,
}: {
  sample: SensorSample
  ideal: IdealRanges
}) {
  const issues = issuesOf(sample, ideal)

  if (issues.length === 0) {
    const badge = levelBadge.ideal
    return (
      <StatusBadge tone={badge.tone}>
        <badge.icon aria-hidden='true' />
        {levelLabel('ideal')}
      </StatusBadge>
    )
  }

  return (
    <div className='flex gap-1.5'>
      {issues.map(({ metric, level }) => {
        const badge = levelBadge[level]
        return (
          <StatusBadge key={metric} tone={badge.tone}>
            <badge.icon aria-hidden='true' />
            {id.sensors.table.issues[metric]} {levelLabel(level)}
          </StatusBadge>
        )
      })}
    </div>
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
  const [requestedPage, setRequestedPage] = useState(1)
  const pageCount = Math.ceil(data.rows.length / PAGE_SIZE)
  // The last hour keeps sliding, so the page count can shrink under the reader.
  const page = Math.min(requestedPage, pageCount)
  const rows = data.rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <>
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
          {rows.map((row) => (
            <TableRow key={row.at} className='hover:bg-transparent'>
              <TableCell className={numberClass}>
                <time dateTime={row.at} title={formatRowSpan(range, row.at)}>
                  {formatRowTime(range, row.at)}
                </time>
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
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        total={data.rows.length}
        shown={rows.length}
        unit={id.sensors.table.unit}
        onPageChange={setRequestedPage}
      />
    </>
  )
}

interface SensorTableCardProps {
  query: BoundaryQuery<SensorRows>
  range: SensorRange
}

/** Mounted with `key={range}`, so a new range starts on the first page. */
export function SensorTableCard({ query, range }: SensorTableCardProps) {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>{id.sensors.table.title}</h2>
        <span className='text-muted-foreground'>
          {id.sensors.table.average[range]}
        </span>
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
