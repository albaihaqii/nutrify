import { type UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { formatConfidence } from '@/lib/confidence'
import { timestampedFilename } from '@/lib/csv'
import { downloadTextFile } from '@/lib/download'
import { formatNumber } from '@/lib/format'
import { formatDayTime } from '@/lib/format-time'
import { plantStatusIcon, type PlantStatus } from '@/lib/plant-status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { ExportCsvButton } from '@/components/export-csv-button'
import { QueryBoundary } from '@/components/query-boundary'
import { StatusBadge } from '@/components/status-badge'
import { fetchObservationExport } from '../api/history-queries'
import {
  historyRanges,
  plantIds,
  statusFilters,
  type FilterPatch,
  type HistoryRange,
  type ObservationFilters,
  type ObservationPage,
  type PlantId,
} from '../data/history'
import { buildObservationCsv } from '../lib/csv'

const ALL = 'all'
const SELECT_CLASS = 'h-10 data-[size=default]:h-10'
const LABEL_CLASS = 'text-[13px] font-semibold'
const headClass =
  'h-auto px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground'
const cellClass = 'px-3 py-2.5 whitespace-nowrap'
const numberClass = `${cellClass} tabular-nums`
const { columns } = id.history.table

interface FiltersProps {
  filters: ObservationFilters
  onChange: (patch: FilterPatch) => void
}

function Filters({ filters, onChange }: FiltersProps) {
  return (
    <div className='flex flex-wrap gap-3'>
      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='history-range' className={LABEL_CLASS}>
          {id.history.filters.range}
        </Label>
        <Select
          value={filters.range}
          onValueChange={(value) => onChange({ range: value as HistoryRange })}
        >
          <SelectTrigger
            id='history-range'
            className={`${SELECT_CLASS} w-[200px]`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {historyRanges.map((range) => (
              <SelectItem key={range} value={range}>
                {id.history.ranges[range]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='history-plant' className={LABEL_CLASS}>
          {id.history.filters.plant}
        </Label>
        <Select
          value={filters.plant ?? ALL}
          onValueChange={(value) =>
            onChange({ plant: value === ALL ? undefined : (value as PlantId) })
          }
        >
          <SelectTrigger
            id='history-plant'
            className={`${SELECT_CLASS} w-[140px]`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>{id.history.filters.allPlants}</SelectItem>
            {plantIds.map((plant) => (
              <SelectItem key={plant} value={plant}>
                {plant}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label htmlFor='history-status' className={LABEL_CLASS}>
          {id.history.filters.status}
        </Label>
        <Select
          value={filters.status ?? ALL}
          onValueChange={(value) =>
            onChange({
              status: value === ALL ? undefined : (value as PlantStatus),
            })
          }
        >
          <SelectTrigger
            id='history-status'
            className={`${SELECT_CLASS} w-[180px]`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>
              {id.history.filters.allStatuses}
            </SelectItem>
            {statusFilters.map((status) => (
              <SelectItem key={status} value={status}>
                {id.plantStatus[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden='true'>
      {Array.from({ length: 10 }, (_, index) => (
        <Skeleton key={index} className='h-9 w-full' />
      ))}
    </div>
  )
}

function ObservationsTable({ data }: { data: ObservationPage }) {
  return (
    <Table>
      <TableHeader>
        <TableRow className='hover:bg-transparent'>
          <TableHead className={headClass}>{columns.time}</TableHead>
          <TableHead className={headClass}>{columns.plant}</TableHead>
          <TableHead className={headClass}>{columns.status}</TableHead>
          <TableHead className={headClass}>{columns.confidence}</TableHead>
          <TableHead className={headClass}>{columns.agreement}</TableHead>
          <TableHead className={headClass}>{columns.ph}</TableHead>
          <TableHead className={headClass}>{columns.ec}</TableHead>
          <TableHead className={headClass}>{columns.temperature}</TableHead>
          <TableHead className={headClass}>
            <span className='sr-only'>{columns.actions}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.rows.map((row) => {
          const Icon = plantStatusIcon[row.status]
          return (
            <TableRow key={row.id} className='hover:bg-transparent'>
              <TableCell className={numberClass}>
                {formatDayTime(row.at)}
              </TableCell>
              <TableCell className={cellClass}>
                <strong className='font-semibold'>{row.plantId}</strong>
              </TableCell>
              <TableCell className={cellClass}>
                <StatusBadge tone={row.status} dashed={row.status === 'check'}>
                  <Icon aria-hidden='true' />
                  {id.plantStatus[row.status]}
                </StatusBadge>
              </TableCell>
              <TableCell className={numberClass}>
                {formatConfidence(row.confidence)}
              </TableCell>
              <TableCell className={cellClass}>
                {id.history.table.agreement
                  .replace('{agree}', String(row.agree))
                  .replace('{total}', String(row.total))}
              </TableCell>
              <TableCell className={numberClass}>
                {formatNumber(row.ph, 1)}
              </TableCell>
              <TableCell className={numberClass}>
                {formatNumber(row.ec, 2)}
              </TableCell>
              <TableCell className={numberClass}>
                {formatNumber(row.temperature, 1)} °C
              </TableCell>
              <TableCell className={cellClass}>
                <Button
                  asChild
                  variant='outline'
                  className='h-8 px-2.5 text-[13px]'
                >
                  <Link to='/plants' search={{ plant: row.plantId }}>
                    {id.history.table.detail}
                  </Link>
                </Button>
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function Pagination({
  data,
  onPageChange,
}: {
  data: ObservationPage
  onPageChange: (page: number) => void
}) {
  const from = (data.page - 1) * data.pageSize + 1
  const to = from + data.rows.length - 1
  const pageCount = Math.ceil(data.total / data.pageSize)

  return (
    <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
      <span className='text-muted-foreground tabular-nums'>
        {id.history.table.showing
          .replace('{from}', formatNumber(from, 0))
          .replace('{to}', formatNumber(to, 0))
          .replace('{total}', formatNumber(data.total, 0))}
      </span>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          className='h-8 px-2.5 text-[13px]'
          disabled={data.page <= 1}
          onClick={() => onPageChange(data.page - 1)}
        >
          {id.history.table.previous}
        </Button>
        <Button
          variant='outline'
          className='h-8 px-2.5 text-[13px]'
          disabled={data.page >= pageCount}
          onClick={() => onPageChange(data.page + 1)}
        >
          {id.history.table.next}
        </Button>
      </div>
    </div>
  )
}

interface ObservationsTableCardProps {
  filters: ObservationFilters
  query: UseQueryResult<ObservationPage>
  onFilterChange: (patch: FilterPatch) => void
  onPageChange: (page: number) => void
}

export function ObservationsTableCard({
  filters,
  query,
  onFilterChange,
  onPageChange,
}: ObservationsTableCardProps) {
  async function handleExport() {
    const rows = await fetchObservationExport(filters)
    downloadTextFile(
      timestampedFilename('riwayat-pengamatan'),
      buildObservationCsv(rows),
      'text/csv;charset=utf-8'
    )
  }

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-end justify-between gap-3'>
        <Filters filters={filters} onChange={onFilterChange} />
        <ExportCsvButton onExport={handleExport} />
      </div>

      <QueryBoundary
        query={query}
        skeleton={<TableSkeleton />}
        empty={{
          when: (data) => data.total === 0,
          view: <EmptyState title={id.history.table.empty} />,
        }}
      >
        {(data) => (
          <>
            <ObservationsTable data={data} />
            <Pagination data={data} onPageChange={onPageChange} />
          </>
        )}
      </QueryBoundary>
    </Card>
  )
}
