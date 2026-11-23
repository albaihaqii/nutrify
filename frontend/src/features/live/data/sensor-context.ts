export type SensorKey = 'ph' | 'ec' | 'tds' | 'temperature'
export type SensorLevel = 'ideal' | 'low' | 'high'

export interface SensorContextItem {
  key: SensorKey
  value: number
  decimals: number
  unit: string
  level: SensorLevel
}
