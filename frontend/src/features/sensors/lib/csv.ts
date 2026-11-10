import { id } from '@/locales/id'
import { type SensorRange, type SensorSample } from '../data/sensors'

const quote = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`

/** CSV with a BOM so Excel reads the UTF-8 header (the ° sign) correctly. */
export function buildSensorCsv(samples: SensorSample[]): string {
  const columns = id.sensors.table.columns
  const header = [
    columns.time,
    columns.ph,
    columns.ec,
    columns.tds,
    columns.temperature,
  ]
  const lines = samples.map((sample) => [
    sample.at,
    sample.ph,
    sample.ec,
    sample.tds,
    sample.temperature,
  ])
  return `\uFEFF${[header, ...lines]
    .map((line) => line.map(quote).join(','))
    .join('\r\n')}`
}

const pad = (value: number) => String(value).padStart(2, '0')

export function buildExportFilename(
  range: SensorRange,
  now: Date = new Date()
): string {
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `sensor-tandon-${range}-${day}-${time}.csv`
}
