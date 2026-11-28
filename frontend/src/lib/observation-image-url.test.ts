import { describe, expect, it } from 'vitest'
import { observationImageUrl } from './observation-image-url'

describe('observationImageUrl', () => {
  it('names the observation and the view, with the token encoded', () => {
    expect(observationImageUrl(9, 'segmentation', 'a b')).toMatch(
      /\/observations\/9\/image\?view=segmentation&token=a%20b$/
    )
  })
})
