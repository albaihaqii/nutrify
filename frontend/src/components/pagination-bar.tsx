import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/button'

interface PaginationBarProps {
  /** 1-based. */
  page: number
  pageSize: number
  /** All rows matching the filters, not only this page. */
  total: number
  /** Rows on the current page. */
  shown: number
  onPageChange: (page: number) => void
}

export function PaginationBar({
  page,
  pageSize,
  total,
  shown,
  onPageChange,
}: PaginationBarProps) {
  const from = (page - 1) * pageSize + 1
  const to = from + shown - 1
  const pageCount = Math.ceil(total / pageSize)

  return (
    <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
      <span className='text-muted-foreground tabular-nums'>
        {id.pagination.showing
          .replace('{from}', formatNumber(from, 0))
          .replace('{to}', formatNumber(to, 0))
          .replace('{total}', formatNumber(total, 0))}
      </span>
      <div className='flex gap-2'>
        <Button
          variant='outline'
          className='h-8 px-2.5 text-[13px]'
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {id.pagination.previous}
        </Button>
        <Button
          variant='outline'
          className='h-8 px-2.5 text-[13px]'
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          {id.pagination.next}
        </Button>
      </div>
    </div>
  )
}
