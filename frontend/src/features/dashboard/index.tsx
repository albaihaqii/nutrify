import { id } from '@/locales/id'
import { freshnessSubtitle } from '@/lib/freshness'
import { useSensorFreshness } from '@/hooks/use-sensor-freshness'
import { FreshnessBanner } from '@/components/freshness-banner'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { InsightSection } from './components/insight-section'
import { KpiSection } from './components/kpi-section'
import { RecordsSection } from './components/records-section'
import { TrendSection } from './components/trend-section'

export function Dashboard() {
  const freshness = useSensorFreshness()

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead
        title={id.nav.items.dashboard}
        description={freshnessSubtitle(
          id.dashboard.subtitle,
          freshness.state,
          freshness.ageSeconds
        )}
      />
      <FreshnessBanner {...freshness} />
      <KpiSection stale={freshness.state === 'stale'} />
      <TrendSection />
      <InsightSection />
      <RecordsSection />
    </Main>
  )
}
