import { type PlantId } from '@/features/dataset/data/dataset'

export type Severity = 'info' | 'warning' | 'critical'

const adviceSources = ['llm', 'rules'] as const
type AdviceSource = (typeof adviceSources)[number]

export const sourceFilters = ['all', ...adviceSources] as const
export type SourceFilter = (typeof sourceFilters)[number]

const ADVICE_PAGE_SIZE = 10

export interface AdviceFilters {
  source: SourceFilter
  plant?: PlantId
  /** 1-based. */
  page: number
}

export type AdviceFilterPatch = Partial<Pick<AdviceFilters, 'source' | 'plant'>>

export interface AdviceItem {
  id: number
  /** ISO timestamp. */
  createdAt: string
  /** Hole 1 to 6, or null for advice about the tank as a whole. */
  plantPosition: number | null
  severity: Severity
  summary: string
  likelyCauses: string[]
  suggestedActions: string[]
  source: AdviceSource
  /** The LLM that wrote the advice; null for the rules. */
  modelName: string | null
}

export interface AdvicePage {
  rows: AdviceItem[]
  /** All advice matching the filters, not only this page. */
  total: number
  page: number
  pageSize: number
}

export const emptyAdvicePage: AdvicePage = {
  rows: [],
  total: 0,
  page: 1,
  pageSize: ADVICE_PAGE_SIZE,
}

const ruleCodes = [
  'n_deficiency_in_range',
  'fe_deficiency',
  'ph_out_of_range',
  'ec_out_of_range',
  'temperature_out_of_range',
  'needs_check',
] as const
export type RuleCode = (typeof ruleCodes)[number]

/** One fallback rule. The condition is fixed in the backend; only the actions can be edited. */
export interface FallbackRule {
  code: RuleCode
  suggestedActions: string[]
}

// ---- Dummy data. The real API returns the stored advice and rules. ----

const DEFAULT_ACTIONS: Record<RuleCode, string[]> = {
  n_deficiency_in_range: [
    'Periksa konsentrasi larutan nutrisi',
    'Pantau selama 24 jam',
  ],
  fe_deficiency: ['Periksa pH tandon dan ketersediaan zat besi'],
  ph_out_of_range: ['Periksa kalibrasi sensor', 'Sesuaikan pH secara manual'],
  ec_out_of_range: ['Periksa kalibrasi sensor', 'Periksa konsentrasi larutan'],
  temperature_out_of_range: [
    'Periksa posisi sensor suhu',
    'Lindungi tandon dari panas atau dingin berlebih',
  ],
  needs_check: ['Periksa tanaman langsung', 'Ambil snapshot baru'],
}

/** Edits made during this session. Dummy only: lost on reload. */
const actionOverrides = new Map<RuleCode, string[]>()

export function setRuleActions(code: RuleCode, actions: string[]): void {
  actionOverrides.set(code, actions)
}

export function buildFallbackRules(): FallbackRule[] {
  return ruleCodes.map((code) => ({
    code,
    suggestedActions: actionOverrides.get(code) ?? DEFAULT_ACTIONS[code],
  }))
}

type Topic = 'n' | 'fe' | 'check' | 'ph' | 'ec' | 'temp'

const TOPIC_RULE: Record<Topic, RuleCode> = {
  n: 'n_deficiency_in_range',
  fe: 'fe_deficiency',
  check: 'needs_check',
  ph: 'ph_out_of_range',
  ec: 'ec_out_of_range',
  temp: 'temperature_out_of_range',
}

const TOPIC_SEVERITY: Record<Topic, Severity> = {
  n: 'warning',
  fe: 'info',
  check: 'info',
  ph: 'warning',
  ec: 'warning',
  temp: 'critical',
}

const TOPIC_SUMMARY: Record<Topic, (plant: number | null) => string> = {
  n: (plant) =>
    `Tanaman pada lubang ${plant} menunjukkan tanda kekurangan nitrogen.`,
  fe: (plant) =>
    `Tanaman pada lubang ${plant} menunjukkan tanda kekurangan zat besi.`,
  check: (plant) => `Status lubang ${plant} perlu dicek langsung.`,
  ph: () => 'pH tandon berada di luar rentang ideal.',
  ec: () => 'EC tandon berada di bawah rentang ideal.',
  temp: () => 'Suhu air melebihi rentang ideal.',
}

/** What the LLM adds on top of the rules: a more specific cause and a longer plan. */
const LLM_DETAIL: Record<Topic, { causes: string[]; actions: string[] }> = {
  n: {
    causes: [
      'Daun menguning sementara pH dan EC masih ideal',
      'Konsentrasi nitrogen dalam larutan mungkin kurang',
    ],
    actions: [
      'Periksa larutan nutrisi dan bandingkan dengan foto sebelumnya',
      'Naikkan nutrisi secara bertahap, lalu pantau 24 jam',
    ],
  },
  fe: {
    causes: ['pH tandon yang tinggi membuat zat besi sulit diserap'],
    actions: ['Periksa pH tandon', 'Pastikan larutan mengandung zat besi'],
  },
  check: {
    causes: ['Keyakinan model rendah atau daun tidak terlihat jelas'],
    actions: ['Periksa tanaman langsung', 'Ambil snapshot baru'],
  },
  ph: {
    causes: ['Sensor belum dikalibrasi', 'Larutan nutrisi berubah'],
    actions: ['Periksa kalibrasi sensor', 'Sesuaikan pH secara manual'],
  },
  ec: {
    causes: ['Larutan nutrisi terlalu encer'],
    actions: ['Periksa kalibrasi sensor', 'Tambahkan nutrisi bertahap'],
  },
  temp: {
    causes: ['Suhu ruangan tinggi', 'Tandon terkena sinar matahari'],
    actions: ['Pindahkan tandon ke tempat teduh', 'Pantau suhu tiap jam'],
  },
}

const MODEL_NAME = 'gemini-flash'

/** Newest first: [minutes ago, source, topic, hole or null for the tank]. */
const SEED: ReadonlyArray<
  readonly [number, 'llm' | 'rules', Topic, number | null]
> = [
  [20, 'rules', 'n', 3],
  [95, 'llm', 'n', 3],
  [190, 'rules', 'ph', null],
  [380, 'llm', 'fe', 5],
  [700, 'llm', 'temp', null],
  [1000, 'rules', 'fe', 5],
  [1500, 'llm', 'check', 1],
  [2100, 'llm', 'ec', null],
  [2900, 'rules', 'n', 3],
  [3600, 'llm', 'n', 3],
  [4400, 'llm', 'fe', 5],
  [5800, 'rules', 'ph', null],
  [7200, 'llm', 'check', 2],
  [8600, 'llm', 'fe', 5],
]

function buildAdvice(now: number): AdviceItem[] {
  return SEED.map(([minutesAgo, source, topic, plant], index) => {
    const llm = source === 'llm'
    const detail = LLM_DETAIL[topic]
    return {
      id: 314 - index,
      createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
      plantPosition: plant,
      severity: TOPIC_SEVERITY[topic],
      summary: TOPIC_SUMMARY[topic](plant),
      likelyCauses: llm ? detail.causes : detail.causes.slice(0, 1),
      suggestedActions: llm
        ? detail.actions
        : DEFAULT_ACTIONS[TOPIC_RULE[topic]],
      source,
      modelName: llm ? MODEL_NAME : null,
    }
  })
}

export function buildAdvicePage(
  filters: AdviceFilters,
  now: number = Date.now()
): AdvicePage {
  const plant =
    filters.plant === undefined ? null : Number(filters.plant.slice(1))
  const matching = buildAdvice(now).filter(
    (item) =>
      (filters.source === 'all' || item.source === filters.source) &&
      (plant === null || item.plantPosition === plant)
  )
  const pageCount = Math.max(1, Math.ceil(matching.length / ADVICE_PAGE_SIZE))
  const page = Math.min(Math.max(1, filters.page), pageCount)
  const start = (page - 1) * ADVICE_PAGE_SIZE

  return {
    rows: matching.slice(start, start + ADVICE_PAGE_SIZE),
    total: matching.length,
    page,
    pageSize: ADVICE_PAGE_SIZE,
  }
}

/** The newest advice whatever the filters are, or null when there is none. */
export function buildLatestAdvice(now: number = Date.now()): AdviceItem | null {
  return buildAdvice(now)[0] ?? null
}
