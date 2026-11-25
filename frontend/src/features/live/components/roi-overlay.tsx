import { type RoiBox } from '@/features/settings/lib/roi'

/**
 * The six plant regions over the camera frame, drawn in the artboard style: a
 * rounded outline and a dark label chip. The white outline has a dark hairline on both
 * sides, so it stays visible on a bright background. The boxes are fractions of the frame,
 * so they stay on the same holes at any size.
 */
export function RoiOverlay({ boxes }: { boxes: RoiBox[] }) {
  return (
    <div aria-hidden='true' className='pointer-events-none absolute inset-0'>
      {boxes.map((box) => (
        <div
          key={box.position}
          className='absolute rounded-md border-2 border-white/90 shadow-[0_0_0_1px_rgb(0_0_0/0.5),inset_0_0_0_1px_rgb(0_0_0/0.5)] @xl/content:rounded-lg'
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
          }}
        >
          <span className='absolute top-[3px] left-[3px] rounded bg-black/80 px-[5px] py-px text-[10px] font-semibold whitespace-nowrap text-white @xl/content:top-1.5 @xl/content:left-1.5 @xl/content:rounded-md @xl/content:px-2 @xl/content:py-0.5 @xl/content:text-xs'>
            L{box.position}
          </span>
        </div>
      ))}
    </div>
  )
}
