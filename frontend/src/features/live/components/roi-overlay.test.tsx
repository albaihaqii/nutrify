import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { defaultBoxes } from '@/features/settings/lib/roi'
import { type LivePlant } from '../data/live-analysis'
import { RoiOverlay } from './roi-overlay'

const normal: LivePlant = {
  position: 1,
  status: 'ok',
  confidence: 0.94,
  rule: '',
}

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

  it('shows the status and the confidence of an analysed region', async () => {
    const { getByText, container } = await render(
      <RoiOverlay boxes={defaultBoxes()} plants={[normal]} />
    )

    await expect.element(getByText('Normal')).toBeInTheDocument()
    await expect.element(getByText('94%')).toBeInTheDocument()
    expect(container.querySelector('div[style]')?.className).toContain(
      'border-[#34b27b]'
    )
  })

  it('draws a region without a class dashed and without a percentage', async () => {
    const { getByText, container } = await render(
      <RoiOverlay
        boxes={defaultBoxes()}
        plants={[{ position: 1, status: 'none', confidence: null, rule: '' }]}
      />
    )

    await expect.element(getByText('Tidak terdeteksi')).toBeInTheDocument()
    expect(container.querySelector('div[style]')?.className).toContain(
      'border-dashed'
    )
    expect(container.textContent).not.toContain('%')
  })

  it('keeps the plain chip for a region the analysis did not reach', async () => {
    const { container } = await render(
      <RoiOverlay boxes={defaultBoxes()} plants={[normal]} />
    )

    const second = container.querySelectorAll('div[style]')[1]
    expect(second?.textContent).toBe('L2')
  })
})
