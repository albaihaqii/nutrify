import { type HistoryRange } from '../data/history'

const DAY_MS = 86_400_000

/** The time a range starts: local midnight for today, otherwise 7 or 30 days back. */
export function rangeStart(range: HistoryRange, now: Date = new Date()): Date {
  if (range === 'today') {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  return new Date(now.getTime() - (range === '7d' ? 7 : 30) * DAY_MS)
}
