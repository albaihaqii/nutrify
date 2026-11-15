import { formatNumber } from '@/lib/format'

/** 0 to 1, always 2 decimals: "0,89". */
export function formatMetric(value: number): string {
  return formatNumber(value, 2)
}

/** 0 to 1 as a whole percentage: "88". */
export function formatPercent(value: number): string {
  return formatNumber(value * 100, 0)
}

/** A split value without trailing zeros: 103 -> "103", 1.35 -> "1,35", 6.4 -> "6,4". */
export function formatThreshold(value: number): string {
  return String(Number(value.toFixed(2))).replace('.', ',')
}

/** "15 November 2026". */
export function formatTrainedDate(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(
    new Date(iso)
  )
}
