import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'

export function Dashboard() {
  return (
    <Main className='flex flex-col gap-6 p-6'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>
          {id.nav.items.dashboard}
        </h1>
        <p className='text-muted-foreground'>{id.dashboard.subtitle}</p>
      </div>
    </Main>
  )
}
