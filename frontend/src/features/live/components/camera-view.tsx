import { useEffect, useRef, useState } from 'react'
import { id } from '@/locales/id'
import { CameraOff, Image, Maximize, Minimize, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { useServiceStatus } from '@/hooks/use-service-status'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/query-boundary'
import { cameraStreamUrl } from '../lib/camera-url'

function OfflineView() {
  return (
    <div className='flex size-full flex-col items-center justify-center gap-2 px-6 text-center text-[#cfd8d3]'>
      <CameraOff className='size-8' aria-hidden='true' />
      <p className='font-medium'>{id.live.camera.offline}</p>
      <p className='text-sm'>{id.live.camera.offlineHint}</p>
    </div>
  )
}

interface CameraViewProps {
  paused: boolean
  onPausedChange: (paused: boolean) => void
}

export function CameraView({ paused, onPausedChange }: CameraViewProps) {
  const status = useServiceStatus()
  const accessToken = useAuthStore((state) => state.auth.accessToken)
  const frameRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const stillRef = useRef<HTMLCanvasElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const sync = () =>
      setIsFullscreen(document.fullscreenElement === frameRef.current)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined)
    } else {
      frameRef.current?.requestFullscreen().catch(() => undefined)
    }
  }

  // Pausing keeps the frame that is on screen: it is copied to a canvas and
  // the stream is closed, so nothing is downloaded while paused.
  function togglePaused() {
    const image = imageRef.current
    const still = stillRef.current
    if (!paused && image && still && image.naturalWidth > 0) {
      still.width = image.naturalWidth
      still.height = image.naturalHeight
      still.getContext('2d')?.drawImage(image, 0, 0)
    }
    onPausedChange(!paused)
  }

  const FullscreenIcon = isFullscreen ? Minimize : Maximize
  const PauseIcon = paused ? Play : Pause

  return (
    <Card className='gap-0 p-3 shadow-none @xl/content:p-4'>
      <div
        ref={frameRef}
        role='img'
        aria-label={id.live.camera.ariaLabel}
        className='relative aspect-video w-full overflow-hidden rounded-xl bg-[#18241E] dark:bg-[#0A100D] [&:fullscreen]:aspect-auto [&:fullscreen]:h-screen [&:fullscreen]:rounded-none'
      >
        {status.data?.webcam && (
          <span className='absolute top-2 left-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white @xl/content:top-3.5 @xl/content:left-4 @xl/content:px-2.5 @xl/content:py-[3px] @xl/content:text-xs'>
            <span
              aria-hidden='true'
              className={cn(
                'size-2 rounded-full',
                paused ? 'bg-chart-5' : 'bg-[#ff6b5e]'
              )}
            />
            {paused ? id.live.camera.paused : id.live.camera.live}
            <span className='hidden @xl/content:inline'>
              · {id.live.camera.source}
            </span>
          </span>
        )}

        <QueryBoundary
          query={status}
          skeleton={
            <Skeleton aria-hidden='true' className='size-full rounded-none' />
          }
        >
          {({ webcam }) =>
            webcam ? (
              <>
                {!paused && (
                  <img
                    ref={imageRef}
                    src={cameraStreamUrl(accessToken)}
                    alt=''
                    className='size-full object-contain'
                  />
                )}
                <canvas
                  ref={stillRef}
                  className={cn(
                    'size-full object-contain',
                    !paused && 'hidden'
                  )}
                />
              </>
            ) : (
              <OfflineView />
            )
          }
        </QueryBoundary>
      </div>

      <div className='mt-3.5 flex flex-wrap items-center justify-between gap-3'>
        <div className='flex flex-1 gap-2 @xl/content:flex-none'>
          <Button
            variant='outline'
            className='h-10 flex-1 @xl/content:flex-none'
            onClick={() => toast.info(id.live.camera.snapshotUnavailable)}
          >
            <Image aria-hidden='true' />
            {id.live.camera.snapshot}
          </Button>
          <Button
            variant='outline'
            className='h-10 flex-1 @xl/content:flex-none'
            aria-pressed={paused}
            onClick={togglePaused}
          >
            <PauseIcon aria-hidden='true' />
            {paused ? id.live.camera.resume : id.live.camera.pause}
          </Button>
          <Button
            variant='outline'
            className='h-10 @xl/content:px-4'
            aria-label={
              isFullscreen
                ? id.live.camera.exitFullscreen
                : id.live.camera.fullscreen
            }
            onClick={toggleFullscreen}
          >
            <FullscreenIcon aria-hidden='true' />
            <span className='hidden @xl/content:inline'>
              {isFullscreen
                ? id.live.camera.exitFullscreen
                : id.live.camera.fullscreen}
            </span>
          </Button>
        </div>
      </div>
    </Card>
  )
}
