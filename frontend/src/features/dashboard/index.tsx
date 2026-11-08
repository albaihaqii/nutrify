import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { KpiSection } from './components/kpi-section'

export function Dashboard() {
  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead
        title={id.nav.items.dashboard}
        description={`${id.dashboard.subtitle} · ${id.dashboard.lastUpdated}`}
      />
      <KpiSection />
    </Main>
  )
}
