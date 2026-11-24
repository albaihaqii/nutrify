import { useState } from 'react'
import { id } from '@/locales/id'
import { downloadTextFile } from '@/lib/download'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/empty-state'
import { ExportCsvButton } from '@/components/export-csv-button'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { QueryBoundary } from '@/components/query-boundary'
import {
  fetchSensorExport,
  useSensorHistory,
  useSensorRows,
} from './api/sensors-queries'
import { MetricChartCard } from './components/metric-chart-card'
import { SensorTableCard } from './components/sensor-table-card'
import { metricKeys, sensorRanges, type SensorRange } from './data/sensors'
import { buildExportFilename, buildSensorCsv } from './lib/csv'

const GRID = 'grid grid-cols-1 gap-6 @3xl/content:grid-cols-2'

function ChartsSkeleton() {
  return (
    <div className={GRID} aria-hidden='true'>
      {metricKeys.map((metric) => (
        <Card key={metric} className='gap-0 p-5 shadow-none'>
          <h2 className='mb-2 text-[15px] font-semibold'>
            {id.sensors.metrics[metric].title}
          </h2>
          <Skeleton className='h-[200px] w-full' />
        </Card>
      ))}
    </div>
  )
}

export function Sensors() {
  const [range, setRange] = useState<SensorRange>('24h')
  const history = useSensorHistory(range)
  const rows = useSensorRows(range)

  async function handleExport() {
    const samples = await fetchSensorExport(range)
    downloadTextFile(
      buildExportFilename(range),
      buildSensorCsv(samples),
      'text/csv;charset=utf-8'
    )
  }

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <PageHead
          title={id.nav.items.sensors}
          description={id.sensors.subtitle}
        />
        <div className='flex flex-wrap items-center gap-3'>
          <Tabs
            value={range}
            onValueChange={(value) => setRange(value as SensorRange)}
          >
            <TabsList aria-label={id.sensors.rangeLabel} className='h-[38px]'>
              {sensorRanges.map((item) => (
                <TabsTrigger
                  key={item}
                  value={item}
                  className='px-3 text-[13px] data-[state=active]:bg-card dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-card'
                >
                  {id.sensors.ranges[item]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <ExportCsvButton onExport={handleExport} />
        </div>
      </div>

      <QueryBoundary
        query={history}
        skeleton={<ChartsSkeleton />}
        empty={{
          when: (data) => data.samples.length === 0,
          view: <EmptyState title={id.sensors.chart.empty} />,
        }}
      >
        {(data) => (
          <div className={GRID}>
            {metricKeys.map((metric) => (
              <MetricChartCard
                key={metric}
                metric={metric}
                samples={data.samples}
                ideal={data.ideal[metric]}
                range={range}
              />
            ))}
          </div>
        )}
      </QueryBoundary>

      <SensorTableCard key={range} query={rows} range={range} />
    </Main>
  )
}
