import { useState } from 'react'
import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { useLiveAnalysis } from './api/live-queries'
import { C45Card } from './components/c45-card'
import { CameraView } from './components/camera-view'
import { ComparatorsCard } from './components/comparators-card'
import { LiveAdvisorCard } from './components/live-advisor-card'
import { SensorContextCard } from './components/sensor-context-card'

// Below 5xl everything stacks in the artboard's mobile order (camera, C4.5,
// comparators, advisor, sensor context). From 5xl the two wrappers become the
// 65/35 columns of the desktop artboard.
const COLUMN =
  'contents @5xl/content:flex @5xl/content:min-w-0 @5xl/content:flex-col @5xl/content:gap-6'

export function Live() {
  const [paused, setPaused] = useState(false)
  const analysis = useLiveAnalysis(paused)

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead
        title={id.nav.items.liveCamera}
        description={id.live.subtitle}
      />

      <div className='grid grid-cols-1 gap-6 @5xl/content:grid-cols-[minmax(0,65fr)_minmax(0,35fr)] @5xl/content:items-start'>
        <div className={COLUMN}>
          <div className='order-1 min-w-0'>
            <CameraView
              query={analysis}
              paused={paused}
              onPausedChange={setPaused}
            />
          </div>
          <div className='order-5 min-w-0'>
            <SensorContextCard />
          </div>
        </div>
        <div className={COLUMN}>
          <div className='order-2 min-w-0'>
            <C45Card query={analysis} />
          </div>
          <div className='order-3 min-w-0'>
            <ComparatorsCard query={analysis} />
          </div>
          <div className='order-4 min-w-0'>
            <LiveAdvisorCard />
          </div>
        </div>
      </div>
    </Main>
  )
}
