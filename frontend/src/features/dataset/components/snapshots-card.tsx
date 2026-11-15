import { type UseQueryResult } from '@tanstack/react-query'
import { id } from '@/locales/id'
import { toast } from 'sonner'
import { formatNumber } from '@/lib/format'
import { type PlantStatus } from '@/lib/plant-status'
import { cn } from '@/lib/utils'
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
import { EmptyState } from '@/components/empty-state'
import { PaginationBar } from '@/components/pagination-bar'
import { QueryBoundary } from '@/components/query-boundary'
import { useLabelSnapshot } from '../api/dataset-queries'
import {
  labelFilters,
  plantIds,
  predictionFilters,
  type LabelClass,
  type LabelFilter,
  type PlantId,
  type Snapshot,
  type SnapshotFilterPatch,
  type SnapshotFilters,
  type SnapshotPage,
} from '../data/dataset'
import { SnapshotCard } from './snapshot-card'

const ALL = 'all'
const SELECT_CLASS = 'h-10 data-[size=default]:h-10'
const LABEL_CLASS = 'text-[13px] font-semibold'

interface LabelTabsProps {
  value: LabelFilter
  onChange: (value: LabelFilter) => void
}

function LabelTabs({ value, onChange }: LabelTabsProps) {
  return (
    <div
      role='group'
      aria-label={id.dataset.tabs.group}
      className='inline-flex gap-1 rounded-lg bg-muted p-1'
    >
      {labelFilters.map((filter) => (
        <button
          key={filter}
          type='button'
          aria-pressed={value === filter}
          onClick={() => onChange(filter)}
          className={cn(
            'h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary',
            value === filter
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {id.dataset.tabs[filter]}
        </button>
      ))}
    </div>
  )
}

interface FiltersProps {
  filters: SnapshotFilters
  total: number | undefined
  onChange: (patch: SnapshotFilterPatch) => void
}

function Filters({ filters, total, onChange }: FiltersProps) {
  return (
    <div className='mb-4 flex flex-wrap items-end justify-between gap-3'>
      <div className='flex flex-wrap items-end gap-3'>
        <LabelTabs
          value={filters.label}
          onChange={(label) => onChange({ label })}
        />

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='dataset-plant' className={LABEL_CLASS}>
            {id.dataset.filters.plant}
          </Label>
          <Select
            value={filters.plant ?? ALL}
            onValueChange={(value) =>
              onChange({
                plant: value === ALL ? undefined : (value as PlantId),
              })
            }
          >
            <SelectTrigger
              id='dataset-plant'
              className={`${SELECT_CLASS} w-[140px]`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {id.dataset.filters.allPlants}
              </SelectItem>
              {plantIds.map((plant) => (
                <SelectItem key={plant} value={plant}>
                  {plant}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className='flex flex-col gap-1.5'>
          <Label htmlFor='dataset-predicted' className={LABEL_CLASS}>
            {id.dataset.filters.predicted}
          </Label>
          <Select
            value={filters.predicted ?? ALL}
            onValueChange={(value) =>
              onChange({
                predicted: value === ALL ? undefined : (value as PlantStatus),
              })
            }
          >
            <SelectTrigger
              id='dataset-predicted'
              className={`${SELECT_CLASS} w-[190px]`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>
                {id.dataset.filters.allPredictions}
              </SelectItem>
              {predictionFilters.map((status) => (
                <SelectItem key={status} value={status}>
                  {id.plantStatus[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {total !== undefined && (
        <span className='pb-2.5 text-muted-foreground tabular-nums'>
          {id.dataset.count.replace('{n}', formatNumber(total, 0))}
        </span>
      )}
    </div>
  )
}

const GRID =
  'grid grid-cols-1 gap-4 @xl/content:grid-cols-2 @3xl/content:grid-cols-3 @5xl/content:grid-cols-4'

function GridSkeleton() {
  return (
    <div className={GRID} aria-hidden='true'>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className='h-[330px] w-full' />
      ))}
    </div>
  )
}

interface SnapshotsCardProps {
  filters: SnapshotFilters
  query: UseQueryResult<SnapshotPage>
  canLabel: boolean
  onFilterChange: (patch: SnapshotFilterPatch) => void
  onPageChange: (page: number) => void
}

export function SnapshotsCard({
  filters,
  query,
  canLabel,
  onFilterChange,
  onPageChange,
}: SnapshotsCardProps) {
  const labelSnapshot = useLabelSnapshot()

  // Nothing left to label (no other filter) is good news, not an empty result.
  const allDone =
    filters.label === 'unlabeled' && !filters.plant && !filters.predicted

  function handleLabel(snapshot: Snapshot, label: LabelClass | null) {
    labelSnapshot.mutate(
      { snapshot, label },
      {
        onSuccess: () => {
          const message =
            label === null
              ? id.dataset.toast.cleared.replace('{plant}', snapshot.plantId)
              : id.dataset.toast.labeled
                  .replace('{plant}', snapshot.plantId)
                  .replace('{label}', id.dataset.labels[label])

          // A slip of the finger is easy to undo: restore the previous label.
          toast.success(message, {
            action: {
              label: id.dataset.toast.undo,
              onClick: () =>
                labelSnapshot.mutate({ snapshot, label: snapshot.label }),
            },
          })
        },
      }
    )
  }

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <Filters
        filters={filters}
        total={query.data?.total}
        onChange={onFilterChange}
      />

      <QueryBoundary
        query={query}
        skeleton={<GridSkeleton />}
        empty={{
          when: (data) => data.total === 0,
          view: (
            <EmptyState
              title={
                allDone ? id.dataset.empty.unlabeled : id.dataset.empty.filtered
              }
            />
          ),
        }}
      >
        {(data) => (
          <>
            <div className={GRID}>
              {data.rows.map((snapshot) => (
                <SnapshotCard
                  key={snapshot.id}
                  snapshot={snapshot}
                  canLabel={canLabel}
                  busy={labelSnapshot.isPending}
                  onLabel={handleLabel}
                />
              ))}
            </div>
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
