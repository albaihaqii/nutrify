import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap [&>svg]:size-3 [&>svg]:shrink-0',
  {
    variants: {
      tone: {
        ok: 'bg-status-ok-bg text-status-ok-fg',
        n: 'bg-status-n-bg text-status-n-fg',
        fe: 'bg-status-fe-bg text-status-fe-fg',
        check: 'bg-status-check-bg text-status-check-fg',
        low: 'bg-status-low-bg text-status-low-fg',
        high: 'bg-status-high-bg text-status-high-fg',
      },
      dashed: {
        true: 'border-[1.5px] border-dashed border-current',
        false: '',
      },
    },
    defaultVariants: { tone: 'ok', dashed: false },
  }
)

type StatusBadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof statusBadgeVariants>

export function StatusBadge({
  tone,
  dashed,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(statusBadgeVariants({ tone, dashed }), className)}
      {...props}
    />
  )
}
