import { useState } from 'react'
import { id } from '@/locales/id'
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatNumber } from '@/lib/format'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState } from '@/components/empty-state'
import { QueryBoundary } from '@/components/query-boundary'
import { useSensorSeries } from '../api/dashboard-queries'
import {
  chartRanges,
  idealRanges,
  type ChartRange,
  type SensorPoint,
  type SensorSeries,
} from '../data/sensor-series'

const PH_TICKS = [5, 6, 7]
const EC_TICKS = [1, 1.75, 2.5]
const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' }

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: SensorPoint }>
}) {
  const point = payload?.[0]?.payload
  if (!active || !point) return null

  return (
    <div className='rounded-lg border bg-card px-3 py-2 text-xs shadow-md'>
      <div className='mb-1 font-semibold'>{point.label}</div>
      <div className='flex items-center gap-2'>
        <span aria-hidden='true' className='h-0.5 w-3 bg-primary' />
        pH
        <span className='ms-auto font-medium tabular-nums'>
          {formatNumber(point.ph, 2)}
        </span>
      </div>
      <div className='flex items-center gap-2'>
        <span aria-hidden='true' className='h-0.5 w-3 bg-chart-2' />
        EC
        <span className='ms-auto font-medium tabular-nums'>
          {formatNumber(point.ec, 2)} mS/cm
        </span>
      </div>
    </div>
  )
}

function ChartBody({
  series,
  rangeLabel,
}: {
  series: SensorSeries
  rangeLabel: string
}) {
  const allIdeal = series.points.every(
    (point) =>
      point.ph >= idealRanges.ph[0] &&
      point.ph <= idealRanges.ph[1] &&
      point.ec >= idealRanges.ec[0] &&
      point.ec <= idealRanges.ec[1]
  )
  const ariaLabel = `${id.dashboard.chart.ariaSummary} ${rangeLabel}${
    allIdeal ? `, ${id.dashboard.chart.ariaAllIdeal}` : ''
  }`

  return (
    <>
      <div className='flex justify-between text-[11px] text-muted-foreground'>
        <span>pH</span>
        <span>EC</span>
      </div>
      <div role='img' aria-label={ariaLabel}>
        <ResponsiveContainer width='100%' height={250}>
          <LineChart
            data={series.points}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <ReferenceArea
              yAxisId='ph'
              y1={idealRanges.ph[0]}
              y2={idealRanges.ph[1]}
              fill='var(--chart-1)'
              fillOpacity={0.16}
              stroke='none'
            />
            {PH_TICKS.map((value) => (
              <ReferenceLine
                key={value}
                yAxisId='ph'
                y={value}
                stroke='var(--border)'
              />
            ))}
            {idealRanges.ec.map((value) => (
              <ReferenceLine
                key={value}
                yAxisId='ec'
                y={value}
                stroke='var(--chart-2)'
                strokeDasharray='2 4'
                strokeOpacity={0.6}
              />
            ))}
            <XAxis
              dataKey='label'
              ticks={series.ticks}
              interval={0}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              padding={{ left: 12, right: 12 }}
            />
            <YAxis
              yAxisId='ph'
              domain={[5, 7]}
              ticks={PH_TICKS}
              tickFormatter={(value: number) => formatNumber(value, 1)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={36}
            />
            <YAxis
              yAxisId='ec'
              orientation='right'
              domain={[1, 2.5]}
              ticks={EC_TICKS}
              tickFormatter={(value: number) => formatNumber(value, 2)}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={40}
            />
            <Tooltip content={<ChartTooltip />} />
            <Line
              yAxisId='ph'
              dataKey='ph'
              stroke='var(--primary)'
              strokeWidth={2.5}
              strokeLinejoin='round'
              dot={false}
            />
            <Line
              yAxisId='ec'
              dataKey='ec'
              stroke='var(--chart-2)'
              strokeWidth={2.5}
              strokeDasharray='7 4'
              strokeLinejoin='round'
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground'>
        <span className='inline-flex items-center gap-1.5'>
          <svg width='22' height='8' aria-hidden='true'>
            <line
              x1='0'
              x2='22'
              y1='4'
              y2='4'
              stroke='var(--primary)'
              strokeWidth='3'
            />
          </svg>
          {id.dashboard.chart.legend.ph}
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <svg width='22' height='8' aria-hidden='true'>
            <line
              x1='0'
              x2='22'
              y1='4'
              y2='4'
              stroke='var(--chart-2)'
              strokeWidth='3'
              strokeDasharray='6 3'
            />
          </svg>
          {id.dashboard.chart.legend.ec}
        </span>
        <span className='inline-flex items-center gap-1.5'>
          <span
            aria-hidden='true'
            className='size-2.5 rounded-[3px] bg-chart-1 opacity-35'
          />
          {id.dashboard.chart.legend.idealPh}
        </span>
        <span>{id.dashboard.chart.legend.idealEc}</span>
      </div>
    </>
  )
}

export function SensorChart() {
  const [range, setRange] = useState<ChartRange>('24h')
  const query = useSensorSeries(range)
  const rangeLabel = id.dashboard.chart.ranges[range]

  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.chart.title} {rangeLabel}
        </h2>
        <Tabs
          value={range}
          onValueChange={(value) => setRange(value as ChartRange)}
        >
          <TabsList
            aria-label={id.dashboard.chart.rangeLabel}
            className='h-[38px]'
          >
            {chartRanges.map((item) => (
              <TabsTrigger
                key={item}
                value={item}
                className='px-3 text-[13px] data-[state=active]:bg-card dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-card'
              >
                {id.dashboard.chart.ranges[item]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <QueryBoundary
        query={query}
        skeleton={<Skeleton className='h-[300px] w-full' />}
        empty={{
          when: (series) => series.points.length === 0,
          view: <EmptyState title={id.dashboard.chart.empty} />,
        }}
      >
        {(series) => <ChartBody series={series} rangeLabel={rangeLabel} />}
      </QueryBoundary>
    </Card>
  )
}
