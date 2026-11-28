import { describe, expect, it } from 'vitest'
import { rangeStart } from './range'

describe('rangeStart', () => {
  const now = new Date(2026, 10, 28, 14, 30)

  it('starts today at local midnight', () => {
    expect(rangeStart('today', now)).toEqual(new Date(2026, 10, 28))
  })

  it('goes back 7 or 30 days from now', () => {
    expect(rangeStart('7d', now).getTime()).toBe(now.getTime() - 7 * 86_400_000)
    expect(rangeStart('30d', now).getTime()).toBe(
      now.getTime() - 30 * 86_400_000
    )
  })
})
