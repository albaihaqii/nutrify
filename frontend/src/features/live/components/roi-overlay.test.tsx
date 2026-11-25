import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { defaultBoxes } from '@/features/settings/lib/roi'
import { RoiOverlay } from './roi-overlay'

describe('RoiOverlay', () => {
  it('labels the six regions L1 to L6', async () => {
    const { getByText } = await render(<RoiOverlay boxes={defaultBoxes()} />)

    for (let position = 1; position <= 6; position += 1) {
      await expect
        .element(getByText(`L${position}`, { exact: true }))
        .toBeInTheDocument()
    }
  })

  it('places a region by its fractions of the frame', async () => {
    const { container } = await render(
      <div className='relative h-[200px] w-[400px]'>
        <RoiOverlay
          boxes={[{ position: 1, x: 0.25, y: 0.5, w: 0.5, h: 0.25 }]}
        />
      </div>
    )

    const box = container.querySelector<HTMLElement>('div[style]')
    expect(box?.style.left).toBe('25%')
    expect(box?.style.top).toBe('50%')
    expect(box?.style.width).toBe('50%')
    expect(box?.style.height).toBe('25%')
  })
})
