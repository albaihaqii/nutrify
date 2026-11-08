import { useAuthStore } from '@/stores/auth-store'
import { getInitials } from '@/lib/initials'

export function NavUser() {
  const user = useAuthStore((state) => state.auth.user)

  if (!user) return null

  return (
    <div className='flex h-12 items-center gap-2 rounded-lg border px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:px-0'>
      <span
        aria-hidden='true'
        className='flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold'
      >
        {getInitials(user.name)}
      </span>
      <div className='grid min-w-0 flex-1 text-start leading-tight group-data-[collapsible=icon]:hidden'>
        <span className='truncate font-semibold'>{user.name}</span>
        <span className='truncate text-xs text-muted-foreground'>
          {user.email}
        </span>
      </div>
    </div>
  )
}
