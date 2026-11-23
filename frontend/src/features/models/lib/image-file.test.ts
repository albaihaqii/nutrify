import { describe, expect, it } from 'vitest'
import { MAX_IMAGE_BYTES } from '../data/models'
import { imageProblem } from './image-file'

describe('imageProblem', () => {
  it('accepts an image within the size limit', () => {
    expect(imageProblem({ type: 'image/jpeg', size: 1024 })).toBeNull()
    expect(
      imageProblem({ type: 'image/png', size: MAX_IMAGE_BYTES })
    ).toBeNull()
  })

  it('rejects a file that is not an image', () => {
    expect(imageProblem({ type: 'application/pdf', size: 1024 })).toBe(
      'notImage'
    )
    expect(imageProblem({ type: '', size: 1024 })).toBe('notImage')
  })

  it('rejects a photo over the limit', () => {
    expect(
      imageProblem({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 })
    ).toBe('tooLarge')
  })
})
