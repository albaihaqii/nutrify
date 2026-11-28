export const plantIds = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6'] as const
export type PlantId = (typeof plantIds)[number]

/** The id of a hole from its position (1 to 6), or undefined for any other number. */
export function plantIdOf(position: number): PlantId | undefined {
  return plantIds[position - 1]
}
