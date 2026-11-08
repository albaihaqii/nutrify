import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function KpiCardSkeleton() {
  return (
    <Card className='gap-2.5 p-5 shadow-none' aria-hidden='true'>
      <Skeleton className='h-3.5 w-2/5' />
      <Skeleton className='h-[34px] w-3/5' />
      <Skeleton className='h-7 w-full' />
      <Skeleton className='h-2 w-full' />
      <Skeleton className='h-3 w-1/3' />
    </Card>
  )
}
