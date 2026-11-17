import { type UseQueryResult } from '@tanstack/react-query'
import { id } from '@/locales/id'
import { formatDayTime } from '@/lib/format-time'
import { plantIds, type PlantId } from '@/lib/plants'
import { Card } from '@/components/ui/card'
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
import { PaginationBar } from '@/components/pagination-bar'
import { QueryBoundary } from '@/components/query-boundary'
import { SegmentedControl } from '@/components/segmented-control'
import { SeverityBadge } from '@/components/severity-badge'
import { StatusBadge } from '@/components/status-badge'
import {
  sourceFilters,
  type AdviceFilterPatch,
  type AdviceFilters,
  type AdviceItem,
  type AdvicePage,
  type SourceFilter,
} from '../data/advice'
import { TextList } from './text-list'

const ALL = 'all'

const SOURCE_OPTIONS = sourceFilters.map((value) => ({
  value,
  label:
    value === 'all'
      ? id.advisor.history.tabs.all
      : id.advisor.history.tabs[value],
}))

const TEXT_CELL = 'min-w-[220px] whitespace-normal align-top'

interface FiltersProps {
  filters: AdviceFilters
  onChange: (patch: AdviceFilterPatch) => void
}

function Filters({ filters, onChange }: FiltersProps) {
  return (
    <div className='flex flex-wrap items-center gap-3'>
      <SegmentedControl<SourceFilter>
        value={filters.source}
        options={SOURCE_OPTIONS}
        ariaLabel={id.advisor.history.tabs.group}
        onChange={(source) => onChange({ source })}
      />
      <Select
        value={filters.plant ?? ALL}
        onValueChange={(value) =>
          onChange({ plant: value === ALL ? undefined : (value as PlantId) })
        }
      >
        <SelectTrigger
          aria-label={id.advisor.history.plant.label}
          className='h-10 w-[150px] data-[size=default]:h-10'
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{id.advisor.history.plant.all}</SelectItem>
          {plantIds.map((plant) => (
            <SelectItem key={plant} value={plant}>
              {plant}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function AdviceRow({ item }: { item: AdviceItem }) {
  return (
    <TableRow>
      <TableCell className='align-top whitespace-nowrap tabular-nums'>
        {formatDayTime(item.createdAt)}
      </TableCell>
      <TableCell className='align-top font-semibold'>
        {item.plantPosition === null
          ? id.advisor.history.tank
          : `L${item.plantPosition}`}
      </TableCell>
      <TableCell className='align-top'>
        <div className='flex flex-col items-start gap-1'>
          <StatusBadge tone='check' dashed>
            {id.advisor.history.sources[item.source]}
          </StatusBadge>
          {item.modelName && (
            <span className='text-xs text-muted-foreground'>
              {item.modelName}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className='align-top'>
        <SeverityBadge severity={item.severity} />
      </TableCell>
      <TableCell className={TEXT_CELL}>{item.summary}</TableCell>
      <TableCell className={TEXT_CELL}>
        <TextList items={item.likelyCauses} />
      </TableCell>
      <TableCell className={TEXT_CELL}>
        <TextList items={item.suggestedActions} />
      </TableCell>
    </TableRow>
  )
}

function AdviceTable({ rows }: { rows: AdviceItem[] }) {
  const columns = id.advisor.history.columns

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{columns.time}</TableHead>
          <TableHead>{columns.plant}</TableHead>
          <TableHead>{columns.source}</TableHead>
          <TableHead>{columns.severity}</TableHead>
          <TableHead>{columns.summary}</TableHead>
          <TableHead>{columns.causes}</TableHead>
          <TableHead>{columns.actions}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((item) => (
          <AdviceRow key={item.id} item={item} />
        ))}
      </TableBody>
    </Table>
  )
}

interface HistoryCardProps {
  filters: AdviceFilters
  query: UseQueryResult<AdvicePage>
  onFilterChange: (patch: AdviceFilterPatch) => void
  onPageChange: (page: number) => void
}

export function HistoryCard({
  filters,
  query,
  onFilterChange,
  onPageChange,
}: HistoryCardProps) {
  const filtered = filters.source !== 'all' || filters.plant !== undefined

  return (
    <Card className='min-w-0 gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2'>
        <h2 className='text-[15px] font-semibold'>
          {id.advisor.history.title}
        </h2>
        <Filters filters={filters} onChange={onFilterChange} />
      </div>

      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[360px] w-full' />}
        empty={{
          when: (data) => data.total === 0,
          view: (
            <EmptyState
              title={
                filtered
                  ? id.advisor.history.empty.filtered
                  : id.advisor.history.empty.none
              }
            />
          ),
        }}
      >
        {(data) => (
          <>
            <AdviceTable rows={data.rows} />
            <PaginationBar
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              shown={data.rows.length}
              onPageChange={onPageChange}
            />
          </>
        )}
      </QueryBoundary>
    </Card>
  )
}
