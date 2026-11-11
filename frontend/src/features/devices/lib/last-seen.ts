import { id } from '@/locales/id'
import { formatAgo } from '@/lib/format'

/** "8 detik lalu", "1 menit lalu", or "Belum pernah". */
export function formatLastSeen(iso: string | null, now: number): string {
  if (!iso) return id.devices.never

  const seconds = Math.max(
    0,
    Math.round((now - new Date(iso).getTime()) / 1000)
  )
  if (seconds < 60) {
    return id.devices.secondsAgo.replace('{n}', String(seconds))
  }
  return formatAgo(Math.floor(seconds / 60))
}
