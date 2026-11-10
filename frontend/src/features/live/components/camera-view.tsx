import { useEffect, useRef, useState } from 'react'
import { type UseQueryResult } from '@tanstack/react-query'
import { id } from '@/locales/id'
import { Image, Maximize, Minimize, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { formatAgo } from '@/lib/format'
import { plantStatusIcon, type PlantStatus } from '@/lib/plant-status'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { QueryBoundary } from '@/components/query-boundary'
import { type LiveAnalysis, type LivePlant } from '../data/live-analysis'

// Cell outline follows the plant status (same colors as the dashboard map).
const cellBorder: Record<PlantStatus, string> = {
  ok: 'border-solid border-chart-1',
  n: 'border-solid border-chart-3',
  fe: 'border-solid border-chart-4',
  check: 'border-dashed border-chart-5',
}

// Leaf colors of the placeholder illustration only; replaced by the webcam.
const leafColor: Record<PlantStatus, string> = {
  ok: '#3E9B57',
  n: '#B9B84A',
  fe: '#A9CF86',
  check: '#7C8F80',
}

function formatAnalyzed(seconds: number) {
  const text =
    seconds < 60
      ? id.live.camera.secondsAgo.replace('{n}', String(seconds))
      : formatAgo(Math.floor(seconds / 60))
  return id.live.camera.analyzedAgo.replace('{time}', text)
}

function PlantCell({ plant }: { plant: LivePlant }) {
  const Icon = plantStatusIcon[plant.status]
  const percent =
    plant.confidence === null ? '' : ` ${Math.round(plant.confidence * 100)}%`

  return (
    <div
      className={cn(
        'relative flex items-end justify-center rounded-md border-2 bg-black/25 @xl/content:items-center @xl/content:rounded-lg',
        cellBorder[plant.status]
      )}
    >
      <span className='absolute top-[3px] left-[3px] inline-flex items-center gap-[3px] rounded bg-black/80 px-[5px] py-px text-[10px] font-semibold whitespace-nowrap text-white @xl/content:top-1.5 @xl/content:left-1.5 @xl/content:gap-[5px] @xl/content:rounded-md @xl/content:px-2 @xl/content:py-0.5 @xl/content:text-xs'>
        <Icon className='size-2.5 @xl/content:size-3' aria-hidden='true' />
        <span className='@xl/content:hidden'>
          {plant.id} {id.live.camera.shortStatus[plant.status]}
          {percent}
        </span>
        <span className='hidden @xl/content:inline'>
          {plant.id} {id.plantStatus[plant.status]}
          {percent}
        </span>
      </span>
      <svg
        viewBox='0 0 100 80'
        className='h-[62%] w-[70%] @xl/content:h-[70%] @xl/content:w-[62%]'
        aria-hidden='true'
      >
        <ellipse
          cx='34'
          cy='48'
          rx='22'
          ry='12'
          transform='rotate(-25 34 48)'
          fill={leafColor[plant.status]}
        />
        <ellipse
          cx='66'
          cy='48'
          rx='22'
          ry='12'
          transform='rotate(25 66 48)'
          fill={leafColor[plant.status]}
        />
        <ellipse
          cx='50'
          cy='36'
          rx='14'
          ry='24'
          fill={leafColor[plant.status]}
        />
      </svg>
    </div>
  )
}

function FrameSkeleton() {
  return (
    <Skeleton
      aria-hidden='true'
      className='h-[300px] w-full rounded-xl @xl/content:h-[500px]'
    />
  )
}

interface CameraViewProps {
  query: UseQueryResult<LiveAnalysis>
  paused: boolean
  onPausedChange: (paused: boolean) => void
}

export function CameraView({ query, paused, onPausedChange }: CameraViewProps) {
  const frameRef = useRef<HTMLDivElement>(null)
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

  const FullscreenIcon = isFullscreen ? Minimize : Maximize
  const PauseIcon = paused ? Play : Pause

  return (
    <Card className='gap-0 p-3 shadow-none @xl/content:p-4'>
      <div
        ref={frameRef}
        role='img'
        aria-label={id.live.camera.ariaLabel}
        className='relative h-[300px] overflow-hidden rounded-xl bg-[#18241E] px-2.5 pt-[34px] pb-2.5 @xl/content:h-[500px] @xl/content:px-7 @xl/content:pt-11 @xl/content:pb-7 dark:bg-[#0A100D] [&:fullscreen]:h-screen [&:fullscreen]:rounded-none'
      >
        <span className='absolute top-2 left-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white @xl/content:top-3.5 @xl/content:left-4 @xl/content:px-2.5 @xl/content:py-[3px] @xl/content:text-xs'>
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

        <QueryBoundary
          query={query}
          skeleton={<FrameSkeleton />}
          empty={{
            when: (analysis) => analysis.plants.length === 0,
            view: (
              <div className='flex h-full items-center justify-center'>
                <p className='text-sm text-[#cfd8d3]'>{id.live.camera.empty}</p>
              </div>
            ),
          }}
        >
          {(analysis) => (
            <div className='grid h-full grid-cols-3 grid-rows-2 gap-1.5 @xl/content:gap-3'>
              {analysis.plants.map((plant) => (
                <PlantCell key={plant.id} plant={plant} />
              ))}
            </div>
          )}
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
            onClick={() => onPausedChange(!paused)}
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
        {query.data && query.data.plants.length > 0 && (
          <span className='hidden text-muted-foreground tabular-nums @xl/content:inline'>
            {formatAnalyzed(query.data.analyzedSecondsAgo)}
          </span>
        )}
      </div>
    </Card>
  )
}
