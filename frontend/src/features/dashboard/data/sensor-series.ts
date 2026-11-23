export type ChartRange = '1h' | '24h' | '7d'

export type SensorPoint = { label: string; ph: number; ec: number }

export type IdealPair = [min: number, max: number]

export type SensorSeries = {
  points: SensorPoint[]
  ticks: string[]
  /** Ideal ranges drawn behind the lines; they come from the settings. */
  ideal: { ph: IdealPair; ec: IdealPair }
}

export const chartRanges: ChartRange[] = ['1h', '24h', '7d']
