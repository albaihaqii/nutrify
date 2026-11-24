import { id } from '@/locales/id'

const pad = (value: number) => String(value).padStart(2, '0')

/** "09:42" in the viewer's local time. */
export function formatClock(iso: string): string {
  const date = new Date(iso)
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()

/** "Hari ini 09:42", "Kemarin 09:42", or "8 Nov 09:42". */
export function formatDayTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso)
  const time = formatClock(iso)
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (diffDays === 0) return `${id.plants.today} ${time}`
  if (diffDays === 1) return `${id.plants.yesterday} ${time}`

  const day = new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(date)
  return `${day} ${time}`
}

const dayFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
})

const fullDayFormat = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** "Hari ini", "Kemarin", or "Sab, 21 Nov". */
function dayLabel(date: Date, now: Date): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (diffDays === 0) return id.plants.today
  if (diffDays === 1) return id.plants.yesterday
  return dayFormat.format(date)
}

/** "Hari ini, 16:35", "Kemarin, 23:55", or "Sab, 21 Nov, 08:00". */
export function formatDateTime(iso: string, now: Date = new Date()): string {
  return `${dayLabel(new Date(iso), now)}, ${formatClock(iso)}`
}

/**
 * "Sabtu, 21 November 2026, 08:00–08:59": the full date and the span of a
 * bucket that starts at `iso`; a one-minute bucket shows just its minute.
 */
export function formatBucketSpan(iso: string, bucketMinutes: number): string {
  const start = new Date(iso)
  const day = fullDayFormat.format(start)
  if (bucketMinutes <= 1) return `${day}, ${formatClock(iso)}`

  const end = new Date(start.getTime() + (bucketMinutes - 1) * 60_000)
  return `${day}, ${formatClock(iso)}–${formatClock(end.toISOString())}`
}
