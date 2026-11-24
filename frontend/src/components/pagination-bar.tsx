import { id } from '@/locales/id'
import { formatNumber } from '@/lib/format'
import { pageItems } from '@/lib/pagination'
import { Button } from '@/components/ui/button'

interface PaginationBarProps {
  /** 1-based. */
  page: number
  pageSize: number
  /** All rows matching the filters, not only this page. */
  total: number
  /** Rows on the current page. */
  shown: number
  /** What the rows are called, shown after the total ("baris"). */
  unit?: string
  onPageChange: (page: number) => void
}

const buttonClass = 'h-8 px-2.5 text-[13px]'
const numberClass = `${buttonClass} min-w-8 tabular-nums`

export function PaginationBar({
  page,
  pageSize,
  total,
  shown,
  unit,
  onPageChange,
}: PaginationBarProps) {
  const from = (page - 1) * pageSize + 1
  const to = from + shown - 1
  const pageCount = Math.ceil(total / pageSize)

  const summary = id.pagination.showing
    .replace('{from}', formatNumber(from, 0))
    .replace('{to}', formatNumber(to, 0))
    .replace('{total}', formatNumber(total, 0))

  return (
    <div className='mt-4 flex flex-wrap items-center justify-between gap-3'>
      <span className='text-muted-foreground tabular-nums'>
        {unit ? `${summary} ${unit}` : summary}
      </span>
      {pageCount > 1 && (
        <nav
          aria-label={id.pagination.label}
          className='flex flex-wrap items-center gap-1.5'
        >
          <Button
            variant='outline'
            className={buttonClass}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            {id.pagination.previous}
          </Button>
          <span className='px-1 text-muted-foreground tabular-nums sm:hidden'>
            {id.pagination.pageOf
              .replace('{page}', formatNumber(page, 0))
              .replace('{count}', formatNumber(pageCount, 0))}
          </span>
          <div className='hidden items-center gap-1.5 sm:flex'>
            {pageItems(page, pageCount).map((item, index) =>
              item === 'gap' ? (
                <span
                  key={`gap-${index}`}
                  aria-hidden='true'
                  className='px-1 text-muted-foreground'
                >
                  …
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === page ? 'default' : 'outline'}
                  className={numberClass}
                  aria-label={id.pagination.page.replace(
                    '{page}',
                    formatNumber(item, 0)
                  )}
                  aria-current={item === page ? 'page' : undefined}
                  onClick={() => onPageChange(item)}
                >
                  {formatNumber(item, 0)}
                </Button>
              )
            )}
          </div>
          <Button
            variant='outline'
            className={buttonClass}
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            {id.pagination.next}
          </Button>
        </nav>
      )}
    </div>
  )
}
