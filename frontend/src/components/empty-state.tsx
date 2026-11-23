import { Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  fill?: boolean
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  fill = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-dashed p-5 text-center',
        fill && 'flex flex-1 flex-col items-center justify-center',
        className
      )}
    >
      <Icon
        aria-hidden='true'
        className='mx-auto size-5 text-muted-foreground'
      />
      <p className='mt-1.5 font-semibold'>{title}</p>
      {description && (
        <p className='text-xs text-muted-foreground'>{description}</p>
      )}
    </div>
  )
}
