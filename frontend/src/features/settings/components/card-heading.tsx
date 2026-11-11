import { type ReactNode } from 'react'

interface CardHeadingProps {
  title: string
  description?: string
  action?: ReactNode
}

/** Same title block for every card on the page. */
export function CardHeading({ title, description, action }: CardHeadingProps) {
  return (
    <div className='mb-4 flex flex-wrap items-start justify-between gap-3'>
      <div>
        <h2 className='text-[15px] font-semibold'>{title}</h2>
        {description && (
          <p className='mt-0.5 text-sm text-muted-foreground'>{description}</p>
        )}
      </div>
      {action}
    </div>
  )
}
