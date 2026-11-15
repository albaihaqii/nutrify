import { cn } from '@/lib/utils'

interface SegmentedControlProps<T extends string> {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  ariaLabel: string
  onChange: (value: T) => void
}

/** A small group of toggle buttons where exactly one is on. */
export function SegmentedControl<T extends string>({
  value,
  options,
  ariaLabel,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <div
      role='group'
      aria-label={ariaLabel}
      className='inline-flex gap-1 rounded-lg bg-muted p-1'
    >
      {options.map((option) => (
        <button
          key={option.value}
          type='button'
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-8 rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
