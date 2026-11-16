import { type PlantStatus } from '@/lib/plant-status'

export const labelClasses = ['normal', 'n_deficiency', 'fe_deficiency'] as const
export type LabelClass = (typeof labelClasses)[number]

/** The status badge each label is drawn with (same colours as the rest of the app). */
export const labelStatus: Record<LabelClass, PlantStatus> = {
  normal: 'ok',
  n_deficiency: 'n',
  fe_deficiency: 'fe',
}

export const labelFilters = ['unlabeled', 'labeled', 'all'] as const
export type LabelFilter = (typeof labelFilters)[number]

export const qcStatuses = [
  'ok',
  'invalid_leaf',
  'stale_sensor',
  'needs_check',
] as const
export type QcStatus = (typeof qcStatuses)[number]

export const plantIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const
export type PlantId = (typeof plantIds)[number]

export const predictionFilters = [
  'ok',
  'n',
  'fe',
  'check',
] as const satisfies readonly PlantStatus[]

const PAGE_SIZE = 8

export interface SnapshotFilters {
  label: LabelFilter
  plant?: PlantId
  /** What the model predicted. Only a filter: it is never shown on a card. */
  predicted?: PlantStatus
  /** 1-based. */
  page: number
}

export type SnapshotFilterPatch = Partial<
  Pick<SnapshotFilters, 'label' | 'plant' | 'predicted'>
>

/** A hole's region of the frame, as fractions (0 to 1) of its width and height. */
export interface Roi {
  x: number
  y: number
  w: number
  h: number
}

export type SnapshotPicture =
  /** The stored camera frame, cropped to the hole with the region saved at capture time. */
  | { kind: 'frame'; url: string; roi: Roi }
  /** A drawn leaf, used while the data is dummy and no frame exists yet. */
  | { kind: 'sketch'; look: PlantStatus }

export interface Snapshot {
  id: string
  plantId: string
  /** ISO timestamp. */
  at: string
  /** Sensor values stored with the snapshot; null when they were not stored. */
  ph: number | null
  ec: number | null
  temperature: number | null
  qc: QcStatus
  label: LabelClass | null
  picture: SnapshotPicture
}

export interface SnapshotPage {
  rows: Snapshot[]
  /** All snapshots matching the filters, not only this page. */
  total: number
  page: number
  pageSize: number
}

export interface DatasetSummary {
  totalObservations: number
  /** Labeled by hand, whatever their quality. */
  labeled: number
  /** Labeled and with qc "ok": exactly the rows the export contains. */
  usable: number
  /** Usable rows per class. */
  byClass: Record<LabelClass, number>
}

export const emptySnapshotPage: SnapshotPage = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: PAGE_SIZE,
}

export const emptySummary: DatasetSummary = {
  totalObservations: 0,
  labeled: 0,
  usable: 0,
  byClass: { normal: 0, n_deficiency: 0, fe_deficiency: 0 },
}

// ---- Dummy data. The real API filters, paginates and exports on the server. ----

type Look = Extract<PlantStatus, 'ok' | 'n' | 'fe'>

interface DummyRecord extends Snapshot {
  predicted: PlantStatus
  meanR: number
  meanG: number
  meanB: number
}

/** One analysis cycle every 2 hours, 6 holes each. */
const CYCLES = 20
const CYCLE_MINUTES = 120
/** Cycles from this one on (the older ones) already carry a label. */
const LABELED_FROM_CYCLE = 10

const LOOK_LABEL: Record<Look, LabelClass> = {
  ok: 'normal',
  n: 'n_deficiency',
  fe: 'fe_deficiency',
}

const BASE_RGB: Record<Look, readonly [number, number, number]> = {
  ok: [78, 138, 62],
  n: [128, 150, 58],
  fe: [140, 170, 112],
}

/** A wrong prediction, for rows where the model disagrees with the leaf. */
const WRONG_PREDICTION: Record<Look, PlantStatus> = {
  ok: 'n',
  n: 'fe',
  fe: 'ok',
}

/** Labels set during this session. Dummy only: lost on reload. */
const labelOverrides = new Map<string, LabelClass | null>()

export function setSnapshotLabel(
  snapshotId: string,
  label: LabelClass | null
): void {
  labelOverrides.set(snapshotId, label)
}

const round = (value: number, decimals: number) =>
  Number(value.toFixed(decimals))

/** Repeatable "noise" so the same snapshot always looks the same. */
const wobble = (seed: number, amplitude: number) =>
  round(Math.sin(seed * 12.9898) * amplitude, 1)

const minutesAgo = (now: number, minutes: number) =>
  new Date(now - minutes * 60_000).toISOString()

function lookFor(plantId: string, cycle: number): Look {
  if (plantId === 'L3') return cycle % 4 === 3 ? 'ok' : 'n'
  if (plantId === 'L5') return cycle % 5 === 4 ? 'ok' : 'fe'
  return 'ok'
}

function qcFor(cycle: number, index: number): QcStatus {
  if ((cycle * 6 + index) % 17 === 5) return 'stale_sensor'
  if ((cycle * 3 + index) % 19 === 7) return 'invalid_leaf'
  if ((cycle + index * 5) % 23 === 4) return 'needs_check'
  return 'ok'
}

function predictionFor(
  look: Look,
  qc: QcStatus,
  mismatch: boolean
): PlantStatus {
  if (qc === 'needs_check') return 'check'
  return mismatch ? WRONG_PREDICTION[look] : look
}

function buildRecord(
  cycle: number,
  plantId: string,
  index: number,
  now: number
): DummyRecord {
  const look = lookFor(plantId, cycle)
  const qc = qcFor(cycle, index)
  const seed = cycle * 7 + index * 13
  const [red, green, blue] = BASE_RGB[look]
  const hasSensor = qc !== 'stale_sensor'

  return {
    id: `snap-${cycle}-${plantId}`,
    plantId,
    at: minutesAgo(now, cycle * CYCLE_MINUTES + index * 2 + 5),
    ph: hasSensor ? round(6.1 + 0.15 * Math.sin(cycle / 5 + index), 1) : null,
    ec: hasSensor ? round(1.72 + 0.08 * Math.sin(cycle / 4 + index), 2) : null,
    temperature: hasSensor ? round(24.6 + 0.6 * Math.sin(cycle / 6), 1) : null,
    qc,
    label: cycle >= LABELED_FROM_CYCLE ? LOOK_LABEL[look] : null,
    picture: { kind: 'sketch', look },
    predicted: predictionFor(look, qc, (cycle + index) % 13 === 0),
    meanR: round(red + wobble(seed, 9), 1),
    meanG: round(green + wobble(seed + 1, 9), 1),
    meanB: round(blue + wobble(seed + 2, 9), 1),
  }
}

const PLANT_ORDER: readonly PlantId[] = plantIds

/** Newest first. Built on every call so timestamps stay relative to "now". */
function buildRecords(now: number): DummyRecord[] {
  const records: DummyRecord[] = []
  for (let cycle = 0; cycle < CYCLES; cycle++) {
    PLANT_ORDER.forEach((plantId, index) => {
      records.push(buildRecord(cycle, plantId, index, now))
    })
  }
  return records
}

function currentLabel(record: DummyRecord): LabelClass | null {
  return labelOverrides.has(record.id)
    ? (labelOverrides.get(record.id) ?? null)
    : record.label
}

function matches(record: DummyRecord, filters: SnapshotFilters): boolean {
  const label = currentLabel(record)
  if (filters.label === 'unlabeled' && label !== null) return false
  if (filters.label === 'labeled' && label === null) return false
  if (filters.plant && record.plantId !== filters.plant) return false
  if (filters.predicted && record.predicted !== filters.predicted) return false
  return true
}

function toSnapshot(record: DummyRecord): Snapshot {
  return {
    id: record.id,
    plantId: record.plantId,
    at: record.at,
    ph: record.ph,
    ec: record.ec,
    temperature: record.temperature,
    qc: record.qc,
    label: currentLabel(record),
    picture: record.picture,
  }
}

export function buildSnapshotPage(
  filters: SnapshotFilters,
  now: number = Date.now()
): SnapshotPage {
  const matching = buildRecords(now).filter((record) =>
    matches(record, filters)
  )
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE))
  const page = Math.min(Math.max(1, filters.page), pageCount)
  const start = (page - 1) * PAGE_SIZE

  return {
    rows: matching.slice(start, start + PAGE_SIZE).map(toSnapshot),
    total: matching.length,
    page,
    pageSize: PAGE_SIZE,
  }
}

function usableRecords(
  now: number
): Array<DummyRecord & { label: LabelClass }> {
  const usable: Array<DummyRecord & { label: LabelClass }> = []
  for (const record of buildRecords(now)) {
    const label = currentLabel(record)
    if (label !== null && record.qc === 'ok') usable.push({ ...record, label })
  }
  return usable
}

export function buildDatasetSummary(now: number = Date.now()): DatasetSummary {
  const records = buildRecords(now)
  const byClass: Record<LabelClass, number> = {
    normal: 0,
    n_deficiency: 0,
    fe_deficiency: 0,
  }
  const usable = usableRecords(now)
  for (const record of usable) byClass[record.label] += 1

  return {
    totalObservations: records.length,
    labeled: records.filter((record) => currentLabel(record) !== null).length,
    usable: usable.length,
    byClass,
  }
}

/** Same columns and order as the real export (docs/Schema.md, section 7). */
export const DATASET_CSV_HEADER =
  'Mean_R,Mean_G,Mean_B,pH,EC,Temperature,label,observation_id,plant_position,observed_at'

/**
 * Plain CSV, deliberately without a BOM or quotes: the file goes straight into
 * pandas, where a BOM would turn the first column into "\ufeffMean_R".
 */
export function buildDatasetCsv(now: number = Date.now()): string {
  const rows = usableRecords(now)
    .reverse()
    .map((record) =>
      [
        record.meanR,
        record.meanG,
        record.meanB,
        record.ph,
        record.ec,
        record.temperature,
        record.label,
        record.id,
        record.plantId.replace('L', ''),
        record.at,
      ].join(',')
    )
  return [DATASET_CSV_HEADER, ...rows].join('\n') + '\n'
}
