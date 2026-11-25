import { describe, expect, it } from 'vitest'
import { defaultBoxes } from './roi'

describe('defaultBoxes', () => {
  const boxes = defaultBoxes()

  it('makes six equal boxes numbered row by row', () => {
    expect(boxes.map((box) => box.position)).toEqual([1, 2, 3, 4, 5, 6])
    expect(new Set(boxes.map((box) => `${box.w}x${box.h}`)).size).toBe(1)
    expect(boxes[0].y).toBe(boxes[2].y)
    expect(boxes[3].y).toBe(boxes[5].y)
    expect(boxes[3].y).toBeGreaterThan(boxes[0].y + boxes[0].h)
  })

  it('keeps the left and right margins equal', () => {
    const last = boxes[2]
    expect(1 - (last.x + last.w)).toBeCloseTo(boxes[0].x, 3)
  })

  it('keeps every box inside the frame without touching a neighbour', () => {
    for (const box of boxes) {
      expect(box.x + box.w).toBeLessThanOrEqual(1)
      expect(box.y + box.h).toBeLessThanOrEqual(1)
    }
    expect(boxes[1].x).toBeGreaterThan(boxes[0].x + boxes[0].w)
    expect(boxes[2].x).toBeGreaterThan(boxes[1].x + boxes[1].w)
  })
})
