import { useLocation } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSidebar } from '@/components/ui/sidebar'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { sidebarData } from './data/sidebar-data'
import { UserMenu } from './user-menu'

// Static until the health endpoints exist; replace with real status data.
const services = [
  { label: id.header.status.webcam, online: true },
  { label: id.header.status.sensor, online: true },
  { label: id.header.status.advisor, online: true },
]

function useCurrentPage() {
  const pathname = useLocation({ select: (location) => location.pathname })

  for (const group of sidebarData.navGroups) {
    for (const item of group.items) {
      const url = item.url as string | undefined
      if (!url) continue
      if (pathname === url || pathname.startsWith(`${url}/`)) {
        return { group: group.title, title: item.title }
      }
    }
  }
  return null
}

function StatusChip({ label, online }: { label: string; online: boolean }) {
  return (
    <span className='inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap'>
      <span
        aria-hidden='true'
        className={cn(
          'size-2 rounded-full',
          online ? 'bg-chart-1' : 'border-2 border-chart-5'
        )}
      />
      {label}: {online ? id.header.status.online : id.header.status.offline}
    </span>
  )
}

export function AppHeader() {
  const { toggleSidebar } = useSidebar()
  const page = useCurrentPage()

  return (
    <header className='sticky top-0 z-30 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-2 rounded-t-[inherit] border-b bg-card px-6 py-2 sm:gap-x-4'>
      <Button
        variant='outline'
        size='icon'
        className='size-7'
        aria-label={id.header.toggleSidebar}
        onClick={toggleSidebar}
      >
        <PanelLeft />
      </Button>
      <Separator orientation='vertical' className='h-6' />

      {page && (
        <nav
          aria-label={id.header.breadcrumb}
          className='flex items-center gap-1.5'
        >
          <span className='text-muted-foreground capitalize'>
            {page.group.toLowerCase()}
          </span>
          <span aria-hidden='true' className='text-muted-foreground'>
            /
          </span>
          <strong aria-current='page' className='font-semibold'>
            {page.title}
          </strong>
        </nav>
      )}

      <div className='flex-1' />

      <Search />
      {services.map((service) => (
        <StatusChip key={service.label} {...service} />
      ))}
      <ThemeSwitch />
      <UserMenu />
    </header>
  )
}
