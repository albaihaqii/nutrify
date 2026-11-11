import { type PlantStatus } from '@/lib/plant-status'

export const historyRanges = ['today', '7d', '30d'] as const
export type HistoryRange = (typeof historyRanges)[number]

export const plantIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const
export type PlantId = (typeof plantIds)[number]

export const statusFilters = [
  'ok',
  'n',
  'fe',
  'check',
] as const satisfies readonly PlantStatus[]

export const PAGE_SIZE = 10

export interface ObservationFilters {
  range: HistoryRange
  plant?: PlantId
  status?: PlantStatus
  /** 1-based. */
  page: number
}

export type FilterPatch = Partial<
  Pick<ObservationFilters, 'range' | 'plant' | 'status'>
>

export interface ObservationRow {
  id: string
  /** ISO timestamp of the analysis. */
  at: string
  plantId: string
  status: PlantStatus
  /** 0 to 1, or null when the model has no confident answer. */
  confidence: number | null
  /** How many comparison models agree with C4.5, out of `total`. */
  agree: number
  total: number
  ph: number
  ec: number
  temperature: number
}

export interface ObservationPage {
  rows: ObservationRow[]
  /** All rows matching the filters, not only this page. */
  total: number
  page: number
  pageSize: number
}

export type AdviceSeverity = 'low' | 'medium' | 'high'

export interface AdviceEntry {
  id: string
  /** ISO timestamp. */
  at: string
  source: 'llm' | 'fallback'
  severity: AdviceSeverity
  summary: string
}

export const emptyPage: ObservationPage = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
}

// ---- Dummy data. The real API filters and paginates on the server. ----

/** One analysis cycle every 2 hours, for 30 days. */
const CYCLES = 360
const CYCLE_MINUTES = 120
// Problem plants first, like the artboard.
const PLANT_ORDER = ['L3', 'L5', 'L6', 'L1', 'L2', 'L4']

const round = (value: number, decimals: number) =>
  Number(value.toFixed(decimals))

const minutesAgo = (now: number, minutes: number) =>
  new Date(now - minutes * 60_000).toISOString()

function statusFor(plantId: string, cycle: number): PlantStatus {
  if (plantId === 'L3') return cycle < 4 || cycle % 9 < 2 ? 'n' : 'ok'
  if (plantId === 'L5') return cycle < 3 || cycle % 11 < 2 ? 'fe' : 'ok'
  if (plantId === 'L6') return cycle % 5 === 0 ? 'check' : 'ok'
  return 'ok'
}

const BASE_CONFIDENCE: Record<PlantStatus, number | null> = {
  ok: 0.88,
  n: 0.82,
  fe: 0.76,
  check: null,
}

const AGREE: Record<PlantStatus, number> = { ok: 3, n: 3, fe: 2, check: 0 }

function buildRow(cycle: number, plantId: string, now: number): ObservationRow {
  const index = PLANT_ORDER.indexOf(plantId)
  const status = statusFor(plantId, cycle)
  const base = BASE_CONFIDENCE[status]
  const variation = ((cycle * 7 + index * 3) % 10) / 100
  const at = minutesAgo(now, cycle * CYCLE_MINUTES + 3)

  return {
    id: `${at}-${plantId}`,
    at,
    plantId,
    status,
    confidence: base === null ? null : round(base + variation, 2),
    agree: AGREE[status],
    total: 3,
    ph: round(6.1 + 0.15 * Math.sin(cycle / 5 + index), 1),
    ec: round(1.72 + 0.08 * Math.sin(cycle / 4 + index), 2),
    temperature: round(24.6 + 0.6 * Math.sin(cycle / 6), 1),
  }
}

/** Newest first. Built on every call so timestamps stay relative to "now". */
function buildAllRows(now: number): ObservationRow[] {
  const rows: ObservationRow[] = []
  for (let cycle = 0; cycle < CYCLES; cycle++) {
    for (const plantId of PLANT_ORDER) rows.push(buildRow(cycle, plantId, now))
  }
  return rows
}

function rangeStart(range: HistoryRange, now: number): number {
  if (range === 'today') {
    const date = new Date(now)
    return new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    ).getTime()
  }
  return now - (range === '7d' ? 7 : 30) * 86_400_000
}

function matchingRows(
  filters: ObservationFilters,
  now: number
): ObservationRow[] {
  const start = rangeStart(filters.range, now)
  return buildAllRows(now).filter(
    (row) =>
      new Date(row.at).getTime() >= start &&
      (!filters.plant || row.plantId === filters.plant) &&
      (!filters.status || row.status === filters.status)
  )
}

export function buildObservationPage(
  filters: ObservationFilters,
  now: number = Date.now()
): ObservationPage {
  const matching = matchingRows(filters, now)
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, filters.page), pageCount)
  const start = (page - 1) * PAGE_SIZE

  return {
    rows: matching.slice(start, start + PAGE_SIZE),
    total: matching.length,
    page,
    pageSize: PAGE_SIZE,
  }
}

export function buildObservationExport(
  filters: ObservationFilters,
  now: number = Date.now()
): ObservationRow[] {
  return matchingRows(filters, now)
}

export function buildAdviceHistory(now: number = Date.now()): AdviceEntry[] {
  const entries: Array<
    [number, AdviceEntry['source'], AdviceSeverity, string]
  > = [
    [12, 'llm', 'medium', 'Pantau L3: indikasi kekurangan nitrogen'],
    [
      215,
      'fallback',
      'low',
      'Periksa L5 untuk kemungkinan kekurangan zat besi',
    ],
    [1000, 'llm', 'low', 'Semua lubang normal, lanjutkan pemantauan rutin'],
    [1500, 'llm', 'medium', 'Periksa konsentrasi larutan nutrisi di tandon'],
    [2400, 'fallback', 'low', 'Pantau L6: hasil model belum meyakinkan'],
    [3000, 'llm', 'low', 'Semua lubang normal, lanjutkan pemantauan rutin'],
  ]
  return entries.map(([minutes, source, severity, summary]) => ({
    id: `advice-${minutes}`,
    at: minutesAgo(now, minutes),
    source,
    severity,
    summary,
  }))
}
