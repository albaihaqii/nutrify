import { id } from '@/locales/id'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { useKpiSnapshot } from '../api/kpi-query'
import { KpiCard } from './kpi-card'
import { KpiCardSkeleton } from './kpi-card-skeleton'

const GRID =
  'grid grid-cols-1 gap-6 @xl/content:grid-cols-2 @5xl/content:grid-cols-4'

export function KpiSection() {
  const query = useKpiSnapshot()

  return (
    <section aria-label={id.dashboard.kpi.sectionLabel}>
      <QueryBoundary
        query={query}
        skeleton={
          <div className={GRID}>
            {Array.from({ length: 4 }, (_, index) => (
              <KpiCardSkeleton key={index} />
            ))}
          </div>
        }
        empty={{
          when: (snapshot) => snapshot.metrics.length === 0,
          view: (
            <EmptyState
              title={id.state.emptyTitle}
              description={id.state.emptyDescription}
            />
          ),
        }}
      >
        {(snapshot) => (
          <div className={GRID}>
            {snapshot.metrics.map((metric) => (
              <KpiCard key={metric.key} metric={metric} />
            ))}
          </div>
        )}
      </QueryBoundary>
    </section>
  )
}
