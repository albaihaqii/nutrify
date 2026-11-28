import { type PlantStatus } from '@/lib/plant-status'

export type DailyCondition = { label: string } & Record<PlantStatus, number>

/** `GET /dashboard/daily-conditions` (docs/API.md, section 6). */
export type DailyConditionsResponse = {
  items: Array<{
    start: string
    normal: number
    n_deficiency: number
    fe_deficiency: number
    needs_check: number
  }>
}
