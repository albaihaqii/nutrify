import { STALE_AFTER_MS } from '@/config/realtime'
import { id } from '@/locales/id'
import { formatAgo } from '@/lib/format'
import { useNow } from '@/hooks/use-now'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { StaleBanner } from '@/components/stale-banner'
import { useKpiSnapshot } from './api/kpi-query'
import { InsightSection } from './components/insight-section'
import { KpiSection } from './components/kpi-section'
import { RecordsSection } from './components/records-section'
import { TrendSection } from './components/trend-section'

export function Dashboard() {
  const { data } = useKpiSnapshot()
  const now = useNow()

  const age = data ? now - data.measuredAt : null
  const minutesAgo = age === null ? null : age / 60_000
  const isStale = age !== null && age > STALE_AFTER_MS

  const description =
    minutesAgo === null
      ? id.dashboard.subtitle
      : `${id.dashboard.subtitle} · ${id.state.lastData} ${formatAgo(minutesAgo)}`

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead title={id.nav.items.dashboard} description={description} />
      {isStale && minutesAgo !== null && (
        <StaleBanner minutesAgo={minutesAgo} />
      )}
      <KpiSection />
      <TrendSection />
      <InsightSection />
      <RecordsSection />
    </Main>
  )
}
