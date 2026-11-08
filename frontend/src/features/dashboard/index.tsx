import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { InsightSection } from './components/insight-section'
import { KpiSection } from './components/kpi-section'
import { RecordsSection } from './components/records-section'
import { TrendSection } from './components/trend-section'

export function Dashboard() {
  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead
        title={id.nav.items.dashboard}
        description={`${id.dashboard.subtitle} · ${id.dashboard.lastUpdated}`}
      />
      <KpiSection />
      <TrendSection />
      <InsightSection />
      <RecordsSection />
    </Main>
  )
}
