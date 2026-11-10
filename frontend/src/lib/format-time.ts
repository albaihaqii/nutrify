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
