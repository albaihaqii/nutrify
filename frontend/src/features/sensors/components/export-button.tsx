import { useState } from 'react'
import { id } from '@/locales/id'
import { Download, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { downloadTextFile } from '@/lib/download'
import { Button } from '@/components/ui/button'
import { fetchSensorExport } from '../api/sensors-queries'
import { type SensorRange } from '../data/sensors'
import { buildExportFilename, buildSensorCsv } from '../lib/csv'

export function ExportButton({ range }: { range: SensorRange }) {
  const [busy, setBusy] = useState(false)

  async function handleExport() {
    setBusy(true)
    try {
      const samples = await fetchSensorExport(range)
      downloadTextFile(
        buildExportFilename(range),
        buildSensorCsv(samples),
        'text/csv;charset=utf-8'
      )
    } catch {
      toast.error(id.sensors.exportFailed)
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
      onClick={() => void handleExport()}
    >
      <Icon className={busy ? 'animate-spin' : undefined} aria-hidden='true' />
      {busy ? id.sensors.exporting : id.sensors.exportCsv}
    </Button>
  )
}
