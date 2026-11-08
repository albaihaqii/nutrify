import { type PlantStatus } from '@/lib/plant-status'

export type DailyCondition = { label: string } & Record<PlantStatus, number>

// Holes per status for the last 7 days, oldest first: [ok, n, fe, check].
const counts: [number, number, number, number][] = [
  [4, 1, 1, 0],
  [4, 1, 0, 1],
  [3, 2, 1, 0],
  [3, 1, 1, 1],
  [4, 0, 1, 1],
  [3, 1, 2, 0],
  [3, 1, 1, 1],
]

const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short' })

// Dummy data until the detection history API exists.
export const dailyConditions: DailyCondition[] = counts.map(
  ([ok, n, fe, check], index) => {
    const date = new Date()
    date.setDate(date.getDate() - (counts.length - 1 - index))
    return { label: weekday.format(date), ok, n, fe, check }
  }
)
