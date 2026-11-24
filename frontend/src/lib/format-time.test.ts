import { describe, expect, it } from 'vitest'
import { formatBucketSpan, formatDateTime } from './format-time'

// Built from local parts, so the tests hold in any time zone.
const local = (month: number, day: number, hour: number, minute: number) =>
  new Date(2026, month - 1, day, hour, minute).toISOString()
const now = new Date(2026, 10, 24, 10, 0)

describe('formatDateTime', () => {
  it('says today and yesterday in words', () => {
    expect(formatDateTime(local(11, 24, 8, 5), now)).toBe('Hari ini, 08:05')
    expect(formatDateTime(local(11, 23, 23, 55), now)).toBe('Kemarin, 23:55')
  })

  it('names the weekday and the date after that', () => {
    expect(formatDateTime(local(11, 21, 8, 0), now)).toBe('Sab, 21 Nov, 08:00')
  })
})

describe('formatBucketSpan', () => {
  it('shows the span of a bucket', () => {
    expect(formatBucketSpan(local(11, 21, 8, 0), 60)).toBe(
      'Sabtu, 21 November 2026, 08:00–08:59'
    )
    expect(formatBucketSpan(local(11, 21, 8, 5), 5)).toBe(
      'Sabtu, 21 November 2026, 08:05–08:09'
    )
  })

  it('shows one time for a one-minute bucket', () => {
    expect(formatBucketSpan(local(11, 21, 16, 35), 1)).toBe(
      'Sabtu, 21 November 2026, 16:35'
    )
  })
})
