import { type PlantStatus } from '@/lib/plant-status'

export type PlantReading = {
  id: string
  status: PlantStatus
  /** 0 to 1, or null when the models disagree. */
  confidence: number | null
}

// Dummy data until the detection API exists.
export const plantReadings: PlantReading[] = [
  { id: 'L1', status: 'ok', confidence: 0.94 },
  { id: 'L2', status: 'ok', confidence: 0.91 },
  { id: 'L3', status: 'n', confidence: 0.88 },
  { id: 'L4', status: 'ok', confidence: 0.9 },
  { id: 'L5', status: 'fe', confidence: 0.82 },
  { id: 'L6', status: 'check', confidence: null },
]
