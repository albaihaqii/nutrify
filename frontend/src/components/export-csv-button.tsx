import { useState } from 'react'
import { id } from '@/locales/id'
import { Download, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ExportCsvButtonProps {
  /** Fetches the data and starts the download. Throw to show an error toast. */
  onExport: () => Promise<void>
}

export function ExportCsvButton({ onExport }: ExportCsvButtonProps) {
  const [busy, setBusy] = useState(false)

  async function handleClick() {
    setBusy(true)
    try {
      await onExport()
    } catch {
      toast.error(id.exportCsv.failed)
    } finally {
      setBusy(false)
    }
  }

  const Icon = busy ? LoaderCircle : Download

  return (
    <Button
      variant='outline'
      className='h-10'
      disabled={busy}
      onClick={() => void handleClick()}
    >
      <Icon className={busy ? 'animate-spin' : undefined} aria-hidden='true' />
      {busy ? id.exportCsv.preparing : id.exportCsv.label}
    </Button>
  )
}
