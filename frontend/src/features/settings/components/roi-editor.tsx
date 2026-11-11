import { useRef } from 'react'
import { id } from '@/locales/id'
import { moveBox, resizeBox, type RoiBox } from '../lib/roi'

const KEY_STEP = 0.01

const ARROWS: Record<string, readonly [number, number] | undefined> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

interface DragState {
  mode: 'move' | 'resize'
  startX: number
  startY: number
  origin: RoiBox
}

interface RoiEditorProps {
  boxes: RoiBox[]
  /** Camera frame to align against. Without it the boxes sit on a plain surface. */
  frameSrc?: string
  onChange: (boxes: RoiBox[]) => void
}

export function RoiEditor({ boxes, frameSrc, onChange }: RoiEditorProps) {
  const frameRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)

  function replace(next: RoiBox) {
    onChange(boxes.map((box) => (box.position === next.position ? next : box)))
  }

  function handlePointerDown(
    event: React.PointerEvent<HTMLDivElement>,
    box: RoiBox
  ) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const onHandle =
      event.target instanceof HTMLElement && 'handle' in event.target.dataset
    drag.current = {
      mode: onHandle ? 'resize' : 'move',
      startX: event.clientX,
      startY: event.clientY,
      origin: box,
    }
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const state = drag.current
    const frame = frameRef.current
    if (!state || !frame) return

    // Always computed from where the drag started, so nothing accumulates.
    const rect = frame.getBoundingClientRect()
    const dx = (event.clientX - state.startX) / rect.width
    const dy = (event.clientY - state.startY) / rect.height
    replace(
      state.mode === 'move'
        ? moveBox(state.origin, dx, dy)
        : resizeBox(state.origin, dx, dy)
    )
  }

  function handlePointerEnd() {
    drag.current = null
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    box: RoiBox
  ) {
    const arrow = ARROWS[event.key]
    if (!arrow) return
    event.preventDefault()
    const dx = arrow[0] * KEY_STEP
    const dy = arrow[1] * KEY_STEP
    replace(event.shiftKey ? resizeBox(box, dx, dy) : moveBox(box, dx, dy))
  }

  return (
    <div
      ref={frameRef}
      className='relative aspect-video w-full overflow-hidden rounded-lg bg-muted'
    >
      {frameSrc && (
        <img
          src={frameSrc}
          alt=''
          className='absolute inset-0 size-full object-cover'
          draggable={false}
        />
      )}
      {boxes.map((box) => (
        <div
          key={box.position}
          role='group'
          tabIndex={0}
          aria-label={id.settings.calibration.boxLabel.replace(
            '{n}',
            String(box.position)
          )}
          className='absolute cursor-move touch-none rounded-md border-2 border-primary bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-ring'
          style={{
            left: `${box.x * 100}%`,
            top: `${box.y * 100}%`,
            width: `${box.w * 100}%`,
            height: `${box.h * 100}%`,
          }}
          onPointerDown={(event) => handlePointerDown(event, box)}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={(event) => handleKeyDown(event, box)}
        >
          <span className='pointer-events-none absolute top-1 left-1 rounded bg-black/75 px-1.5 text-xs font-semibold text-white'>
            L{box.position}
          </span>
          <span
            data-handle=''
            className='absolute -right-[6px] -bottom-[6px] size-3 cursor-nwse-resize rounded-sm border-2 border-primary bg-background'
          />
        </div>
      ))}
    </div>
  )
}
