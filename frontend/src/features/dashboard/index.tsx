import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'

export function Dashboard() {
  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead
        title={id.nav.items.dashboard}
        description={id.dashboard.subtitle}
      />
    </Main>
  )
}
