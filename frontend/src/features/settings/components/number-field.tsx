import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NumberFieldProps {
  fieldId: string
  label: string
  value: string
  error?: string | undefined
  decimal?: boolean
  onChange: (value: string) => void
}

export function NumberField({
  fieldId,
  label,
  value,
  error,
  decimal = false,
  onChange,
}: NumberFieldProps) {
  const errorId = `${fieldId}-error`

  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        value={value}
        inputMode={decimal ? 'decimal' : 'numeric'}
        autoComplete='off'
        className='tabular-nums'
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={errorId} role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
    </div>
  )
}
