import { id } from '@/locales/id'
import { kpiMetrics } from '../data/kpis'
import { KpiCard } from './kpi-card'

export function KpiSection() {
  return (
    <section
      aria-label={id.dashboard.kpi.sectionLabel}
      className='grid grid-cols-1 gap-6 @xl/content:grid-cols-2 @5xl/content:grid-cols-4'
    >
      {kpiMetrics.map((metric) => (
        <KpiCard key={metric.key} metric={metric} />
      ))}
    </section>
  )
}
