import { useAuthStore } from '@/stores/auth-store'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Main } from '@/components/layout/main'
import { QueryBoundary } from '@/components/query-boundary'
import { useSettings } from './api/settings-queries'
import { SettingsForm } from './components/settings-form'
import { SettingsHeader } from './components/settings-header'

function SettingsSkeleton() {
  return (
    <>
      <SettingsHeader />
      <div className='flex flex-col gap-6' aria-hidden='true'>
        <Card className='gap-0 p-5 shadow-none'>
          <Skeleton className='h-[150px] w-full' />
        </Card>
        <div className='grid grid-cols-1 gap-6 @3xl/content:grid-cols-2'>
          {Array.from({ length: 2 }, (_, index) => (
            <Card key={index} className='gap-0 p-5 shadow-none'>
              <Skeleton className='h-[420px] w-full' />
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}

export function Settings() {
  const isAdmin = useAuthStore((state) => state.auth.user?.role === 'admin')
  const settings = useSettings()

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <QueryBoundary query={settings} skeleton={<SettingsSkeleton />}>
        {(values) => <SettingsForm settings={values} isAdmin={isAdmin} />}
      </QueryBoundary>
    </Main>
  )
}
