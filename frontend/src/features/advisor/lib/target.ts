import { id } from '@/locales/id'
import { plantIdOf } from '@/lib/plants'

/** What an advice is about: "L3" for a hole, "Tandon" for the tank as a whole. */
export function targetLabel(plantPosition: number | null): string {
  if (plantPosition === null) return id.advisor.history.tank
  return plantIdOf(plantPosition) ?? `L${plantPosition}`
}
