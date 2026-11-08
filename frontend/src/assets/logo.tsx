import { type SVGProps } from 'react'
import { cn } from '@/lib/utils'

export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth={2}
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
      className={cn('size-[18px]', className)}
      {...props}
    >
      <path d='M5 19c0-9 5-14 15-14 0 10-5 15-14 15' />
      <path d='M5 19c3-5 6-8 10-10' />
    </svg>
  )
}
