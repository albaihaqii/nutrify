const DECIMAL = /^-?\d+([.,]\d+)?$/
const INTEGER = /^\d+$/

/** Accepts "5,5", "5.5" and "18". Returns null for anything else. */
export function parseDecimal(raw: string): number | null {
  const text = raw.trim()
  if (!DECIMAL.test(text)) return null
  return Number(text.replace(',', '.'))
}

/** Accepts digits only. Returns null for anything else. */
export function parseInteger(raw: string): number | null {
  const text = raw.trim()
  if (!INTEGER.test(text)) return null
  return Number(text)
}

/** Indonesian decimal comma: 5.5 becomes "5,5". */
export function formatDecimal(value: number): string {
  return String(value).replace('.', ',')
}
