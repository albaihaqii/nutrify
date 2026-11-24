import { describe, expect, it } from 'vitest'
import { pageItems } from './pagination'

describe('pageItems', () => {
  it('lists every page of a short range', () => {
    expect(pageItems(1, 1)).toEqual([1])
    expect(pageItems(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it('collapses the far pages behind a gap', () => {
    expect(pageItems(1, 17)).toEqual([1, 2, 'gap', 17])
    expect(pageItems(9, 17)).toEqual([1, 'gap', 8, 9, 10, 'gap', 17])
    expect(pageItems(17, 17)).toEqual([1, 'gap', 16, 17])
  })

  it('shows a single missing page instead of a gap', () => {
    expect(pageItems(4, 17)).toEqual([1, 2, 3, 4, 5, 'gap', 17])
    expect(pageItems(14, 17)).toEqual([1, 'gap', 13, 14, 15, 16, 17])
  })
})
