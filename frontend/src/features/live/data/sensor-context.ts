export type SensorKey = 'ph' | 'ec' | 'tds' | 'temperature'
export type SensorLevel = 'ideal' | 'low' | 'high'

export interface SensorContextItem {
  key: SensorKey
  value: number
  decimals: number
  unit: string
  level: SensorLevel
}

export const sensorContext: SensorContextItem[] = [
  { key: 'ph', value: 6.1, decimals: 1, unit: '', level: 'ideal' },
  { key: 'ec', value: 1.72, decimals: 2, unit: 'mS/cm', level: 'ideal' },
  { key: 'tds', value: 860, decimals: 0, unit: 'ppm', level: 'ideal' },
  { key: 'temperature', value: 24.6, decimals: 1, unit: '°C', level: 'ideal' },
]
