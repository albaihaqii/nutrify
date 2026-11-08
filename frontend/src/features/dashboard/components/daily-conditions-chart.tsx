import { id } from '@/locales/id'
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { type PlantStatus } from '@/lib/plant-status'
import { Card } from '@/components/ui/card'
import { dailyConditions, type DailyCondition } from '../data/daily-conditions'

// Bottom to top: this is also the stacking order.
const STATUSES: PlantStatus[] = ['ok', 'n', 'fe', 'check']

const COLORS: Record<PlantStatus, string> = {
  ok: 'var(--chart-1)',
  n: 'var(--chart-3)',
  fe: 'var(--chart-4)',
  check: 'var(--chart-5)',
}

const AXIS_TICK = { fontSize: 11, fill: 'var(--muted-foreground)' }

function DailyTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: DailyCondition }>
}) {
  const day = payload?.[0]?.payload
  if (!active || !day) return null

  return (
    <div className='rounded-lg border bg-card px-3 py-2 text-xs shadow-md'>
      <div className='mb-1 font-semibold'>{day.label}</div>
      {STATUSES.map((status) => (
        <div key={status} className='flex items-center gap-2'>
          <span
            aria-hidden='true'
            className='size-2.5 rounded-[3px]'
            style={{ background: COLORS[status] }}
          />
          {id.plantStatus[status]}
          <span className='ms-auto font-medium tabular-nums'>
            {day[status]}
          </span>
        </div>
      ))}
    </div>
  )
}

export function DailyConditionsChart() {
  return (
    <Card className='gap-0 p-5 shadow-none'>
      <div className='mb-4'>
        <h2 className='text-[15px] font-semibold'>
          {id.dashboard.daily.title}
        </h2>
      </div>

      <div role='img' aria-label={id.dashboard.daily.ariaLabel}>
        <ResponsiveContainer width='100%' height={210}>
          <BarChart
            data={dailyConditions}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
          >
            <XAxis
              dataKey='label'
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis hide domain={[0, 6]} />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.5 }}
              content={<DailyTooltip />}
            />
            {STATUSES.map((status) => (
              <Bar
                key={status}
                dataKey={status}
                stackId='plants'
                fill={COLORS[status]}
                stroke='var(--card)'
                strokeWidth={1.5}
                radius={2}
                maxBarSize={34}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className='mt-2 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-muted-foreground'>
        {STATUSES.map((status) => (
          <span key={status} className='inline-flex items-center gap-1.5'>
            <span
              aria-hidden='true'
              className='size-2.5 rounded-[3px]'
              style={{ background: COLORS[status] }}
            />
            {id.plantStatus[status]}
          </span>
        ))}
      </div>
    </Card>
  )
}
