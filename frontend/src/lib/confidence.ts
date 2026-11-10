/** Formats a 0..1 confidence as a percent, or a dash when there is none. */
export function formatConfidence(value: number | null): string {
  return value === null ? '—' : `${Math.round(value * 100)}%`
}
