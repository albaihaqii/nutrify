import { LeafIllustration } from '@/features/plants/components/leaf-illustration'
import { type Roi, type SnapshotPicture } from '../data/dataset'

// The webcam frame is 16:9 (Logitech C270, 1280 x 720).
const FRAME_WIDTH = 16
const FRAME_HEIGHT = 9

interface FrameCropProps {
  url: string
  roi: Roi
}

/** Shows only the hole's region of the stored frame, scaled to fill the box. */
function FrameCrop({ url, roi }: FrameCropProps) {
  return (
    <div
      className='relative h-full shrink-0 overflow-hidden'
      style={{
        aspectRatio: (roi.w * FRAME_WIDTH) / (roi.h * FRAME_HEIGHT),
      }}
    >
      <img
        src={url}
        alt=''
        draggable={false}
        className='absolute max-w-none'
        style={{
          width: `${100 / roi.w}%`,
          left: `${-(roi.x / roi.w) * 100}%`,
          top: `${-(roi.y / roi.h) * 100}%`,
        }}
      />
    </div>
  )
}

export function SnapshotThumbnail({ picture }: { picture: SnapshotPicture }) {
  return (
    <div className='flex h-[150px] items-center justify-center overflow-hidden rounded-lg bg-[#18241E] dark:bg-[#0A100D]'>
      {picture.kind === 'frame' ? (
        <FrameCrop url={picture.url} roi={picture.roi} />
      ) : (
        <LeafIllustration
          status={picture.look}
          className='h-[110px] w-[138px]'
        />
      )}
    </div>
  )
}
