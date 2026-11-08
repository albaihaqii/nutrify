import { type PlantStatus } from '@/lib/plant-status'

export type Observation = {
  id: string
  time: string
  plantId: string
  status: PlantStatus
  /** 0 to 1, or null when the models disagree. */
  confidence: number | null
  /** How many of the other models agree with C4.5. */
  agree: number
  total: number
  ph: number
  ec: number
  temperature: number
}

const reading = { time: '09:42', ph: 6.1, ec: 1.72, temperature: 24.6 }

// Dummy data until the detection API exists.
export const observations: Observation[] = [
  {
    id: 'o1',
    plantId: 'L3',
    status: 'n',
    confidence: 0.88,
    agree: 3,
    total: 3,
    ...reading,
  },
  {
    id: 'o2',
    plantId: 'L5',
    status: 'fe',
    confidence: 0.82,
    agree: 2,
    total: 3,
    ...reading,
  },
  {
    id: 'o3',
    plantId: 'L6',
    status: 'check',
    confidence: null,
    agree: 0,
    total: 3,
    ...reading,
  },
  {
    id: 'o4',
    plantId: 'L1',
    status: 'ok',
    confidence: 0.94,
    agree: 3,
    total: 3,
    ...reading,
  },
  {
    id: 'o5',
    plantId: 'L2',
    status: 'ok',
    confidence: 0.91,
    agree: 3,
    total: 3,
    ...reading,
  },
  {
    id: 'o6',
    plantId: 'L4',
    status: 'ok',
    confidence: 0.9,
    agree: 3,
    total: 3,
    ...reading,
  },
]
