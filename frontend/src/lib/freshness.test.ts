import { describe, expect, it } from 'vitest'
import { formatAgeSeconds } from './format'
import { deriveFreshness, freshnessSubtitle } from './freshness'

const base = {
  hasReading: true,
  ageSeconds: 3,
  staleSeconds: 120,
  unreachable: false,
  checking: false,
}

describe('deriveFreshness', () => {
  it('is fresh while the reading is younger than the stale limit', () => {
    expect(deriveFreshness(base)).toBe('fresh')
    expect(deriveFreshness({ ...base, ageSeconds: 120 })).toBe('fresh')
  })

  it('is stale after the limit', () => {
    expect(deriveFreshness({ ...base, ageSeconds: 121 })).toBe('stale')
  })

  it('shows checking instead of stale while the tab is being rechecked', () => {
    expect(deriveFreshness({ ...base, ageSeconds: 900, checking: true })).toBe(
      'checking'
    )
    expect(deriveFreshness({ ...base, ageSeconds: 3, checking: true })).toBe(
      'fresh'
    )
  })

  it('reports an unreachable server before anything else', () => {
    expect(deriveFreshness({ ...base, unreachable: true })).toBe('unreachable')
    expect(
      deriveFreshness({
        ...base,
        hasReading: false,
        ageSeconds: null,
        unreachable: true,
      })
    ).toBe('unreachable')
  })

  it('is none when the sensor never sent a reading', () => {
    expect(
      deriveFreshness({ ...base, hasReading: false, ageSeconds: null })
    ).toBe('none')
  })
})

describe('formatAgeSeconds', () => {
  it('counts seconds below a minute', () => {
    expect(formatAgeSeconds(0)).toBe('0 detik lalu')
    expect(formatAgeSeconds(3)).toBe('3 detik lalu')
    expect(formatAgeSeconds(59)).toBe('59 detik lalu')
  })

  it('switches to minutes, hours and days', () => {
    expect(formatAgeSeconds(60)).toBe('1 menit lalu')
    expect(formatAgeSeconds(13 * 60 + 20)).toBe('13 menit lalu')
    expect(formatAgeSeconds(2 * 3600)).toBe('2 jam lalu')
    expect(formatAgeSeconds(3 * 86_400)).toBe('3 hari lalu')
  })
})

describe('freshnessSubtitle', () => {
  it('appends the age of the newest reading', () => {
    expect(freshnessSubtitle('Ringkasan', 'fresh', 3)).toBe(
      'Ringkasan · Diperbarui 3 detik lalu'
    )
    expect(freshnessSubtitle('Ringkasan', 'stale', 800)).toBe(
      'Ringkasan · Diperbarui 13 menit lalu'
    )
  })

  it('says it is checking while the tab is rechecked', () => {
    expect(freshnessSubtitle('Ringkasan', 'checking', 800)).toBe(
      'Ringkasan · Memeriksa data…'
    )
  })

  it('shows only the subtitle without a reading', () => {
    expect(freshnessSubtitle('Ringkasan', 'none', null)).toBe('Ringkasan')
  })
})
