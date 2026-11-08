import { Inbox, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type EmptyStateProps = {
  title: string
  description?: string
  icon?: LucideIcon
  className?: string
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-[10px] border border-dashed p-5 text-center',
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
