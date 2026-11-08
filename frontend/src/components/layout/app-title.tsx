import { Link } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { Logo } from '@/assets/logo'

export function AppTitle() {
  return (
    <Link
      to='/dashboard'
      className='flex h-12 items-center gap-2 rounded-md px-2 outline-offset-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 focus-visible:outline-2 focus-visible:outline-ring'
    >
      <span className='flex aspect-square size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary text-primary-foreground'>
        <Logo />
      </span>
      <div className='grid min-w-0 flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden'>
        <span className='truncate text-base font-bold tracking-tight'>
          {id.app.name}
        </span>
        <span className='truncate text-xs text-muted-foreground'>
          {id.app.tagline}
        </span>
      </div>
    </Link>
  )
}
