import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'

interface ModelCardProps {
  title: string
  /** Right side of the heading: a hint or the view switch. */
  aside?: ReactNode
  className?: string
  children: ReactNode
}

export function ModelCard({
  title,
  aside,
  className,
  children,
}: ModelCardProps) {
  return (
    <Card className={cn('min-w-0 gap-0 p-5 shadow-none', className)}>
      <div className='mb-4 flex min-h-8 flex-wrap items-center justify-between gap-x-3 gap-y-1'>
        <h2 className='text-[15px] font-semibold'>{title}</h2>
        {aside}
      </div>
      {children}
    </Card>
  )
}

export function CardHint({ children }: { children: ReactNode }) {
  return <span className='text-xs text-muted-foreground'>{children}</span>
}
