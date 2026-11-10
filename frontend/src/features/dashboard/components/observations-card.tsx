import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { plantStatusIcon } from '@/lib/plant-status'
import { Button } from '@/components/ui/button'
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
import { useObservations } from '../api/dashboard-queries'
import { type Observation } from '../data/observations'

const headClass =
  'h-auto px-3 py-2 text-xs font-semibold whitespace-nowrap text-muted-foreground'
const cellClass = 'px-3 py-2.5 whitespace-nowrap'
const { columns } = id.dashboard.observations

function formatAgreement({ agree, total }: Observation) {
  const text = id.dashboard.observations.agreement
    .replace('{agree}', String(agree))
    .replace('{total}', String(total))
  return agree === 0 ? `${text} ${id.dashboard.observations.different}` : text
}

function ObservationsSkeleton() {
  return (
    <div className='flex flex-col gap-3' aria-hidden='true'>
      {Array.from({ length: 5 }, (_, index) => (
        <Skeleton key={index} className='h-9 w-full' />
      ))}
    </div>
  )
}

function ObservationsTable({ rows }: { rows: Observation[] }) {
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
            <span className='sr-only'>{id.dashboard.observations.actions}</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const Icon = plantStatusIcon[row.status]
          return (
            <TableRow key={row.id} className='hover:bg-transparent'>
              <TableCell className={`${cellClass} tabular-nums`}>
                {row.time}
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
              <TableCell className={`${cellClass} tabular-nums`}>
                {row.confidence === null
                  ? '—'
                  : `${Math.round(row.confidence * 100)}%`}
              </TableCell>
              <TableCell className={cellClass}>
                {formatAgreement(row)}
              </TableCell>
              <TableCell className={`${cellClass} tabular-nums`}>
                {formatNumber(row.ph, 1)}
              </TableCell>
              <TableCell className={`${cellClass} tabular-nums`}>
                {formatNumber(row.ec, 2)}
              </TableCell>
              <TableCell className={`${cellClass} tabular-nums`}>
                {formatNumber(row.temperature, 1)} °C
              </TableCell>
              <TableCell className={cellClass}>
                <Button
                  asChild
                  variant='outline'
                  className='h-8 px-2.5 text-[13px]'
                >
                  <Link to='/plants' search={{ plant: row.plantId }}>
                    {id.dashboard.observations.detail}
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

export function ObservationsCard() {
  const query = useObservations()

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.observations.title}
        </h2>
        <Button asChild variant='outline' className='h-8 px-2.5 text-[13px]'>
          <Link to='/history'>{id.dashboard.observations.viewAll}</Link>
        </Button>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<ObservationsSkeleton />}
        empty={{
          when: (rows) => rows.length === 0,
          view: <EmptyState title={id.dashboard.observations.empty} />,
        }}
      >
        {(rows) => <ObservationsTable rows={rows} />}
      </QueryBoundary>
    </Card>
  )
}
