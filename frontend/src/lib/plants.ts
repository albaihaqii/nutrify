export const plantIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const
export type PlantId = (typeof plantIds)[number]
