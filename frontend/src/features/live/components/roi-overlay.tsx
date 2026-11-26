import { cn } from '@/lib/utils'
import { type RoiBox } from '@/features/settings/lib/roi'
import { type LivePlant, type LiveStatus } from '../data/live-analysis'
import {
  isUncertain,
  liveStatusIcon,
  liveStatusLabel,
} from '../lib/live-status'

// The outline of a classified hole. Fixed colours, not theme tokens: the video
// behind them looks the same in light and dark mode.
const OUTLINE: Record<LiveStatus, string> = {
  ok: 'border-[#34b27b]',
  n: 'border-[#f0b43c]',
  fe: 'border-[#9b7ae8]',
  check: 'border-dashed border-white/80',
  none: 'border-dashed border-white/80',
}

const DEFAULT_OUTLINE = 'border-white/90'

/**
 * The six plant regions over the camera frame, drawn in the artboard style: a
 * rounded outline and a dark label chip. With an analysis the outline takes the
 * colour of the status and the chip says it (`✓ L1 Normal 94%`); without one
 * the chip is just `L1`. The outline has a dark hairline on both sides, so it
 * stays visible on a bright background. The boxes are fractions of the frame,
 * so they stay on the same holes at any size.
 */
export function RoiOverlay({
  boxes,
  plants = [],
}: {
  boxes: RoiBox[]
  plants?: LivePlant[]
}) {
  return (
    <div aria-hidden='true' className='pointer-events-none absolute inset-0'>
      {boxes.map((box) => {
        const plant = plants.find((item) => item.position === box.position)
        const Icon = plant && liveStatusIcon[plant.status]
        return (
          <div
            key={box.position}
            className={cn(
              'absolute rounded-md border-2 shadow-[0_0_0_1px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(0_0_0/0.5)] transition-colors @xl/content:rounded-lg',
              plant ? OUTLINE[plant.status] : DEFAULT_OUTLINE
            )}
            style={{
              left: `${box.x * 100}%`,
              top: `${box.y * 100}%`,
              width: `${box.w * 100}%`,
              height: `${box.h * 100}%`,
            }}
          >
            <span className='absolute top-[3px] left-[3px] inline-flex max-w-[calc(100%-6px)] items-center gap-1 rounded bg-black/80 px-[5px] py-px text-[10px] font-semibold whitespace-nowrap text-white @xl/content:top-1.5 @xl/content:left-1.5 @xl/content:rounded-md @xl/content:px-2 @xl/content:py-0.5 @xl/content:text-xs'>
              {Icon && <Icon aria-hidden='true' className='size-3 shrink-0' />}
              <span>L{box.position}</span>
              {plant && (
                <span className='hidden @xl/content:inline'>
                  {liveStatusLabel(plant.status)}
                </span>
              )}
              {plant &&
                !isUncertain(plant.status) &&
                plant.confidence !== null && (
                  <span className='tabular-nums'>
                    {Math.round(plant.confidence * 100)}%
                  </span>
                )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
