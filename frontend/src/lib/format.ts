import { id } from '@/locales/id'

const LOCALE = 'id-ID'

export function formatNumber(value: number, decimals = 0) {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function formatDelta(value: number, decimals = 0) {
  const sign = value < 0 ? '−' : '+'
  return `${sign}${formatNumber(Math.abs(value), decimals)}`
}

export function formatAgo(minutes: number) {
  if (minutes < 1) return id.time.justNow
  if (minutes < 60) return `${Math.floor(minutes)} ${id.time.minutesAgo}`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ${id.time.hoursAgo}`

  return `${Math.floor(hours / 24)} ${id.time.daysAgo}`
}
