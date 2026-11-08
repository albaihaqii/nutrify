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
