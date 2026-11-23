import { id } from '@/locales/id'
import { formatAgeSeconds } from '@/lib/format'

export type FreshnessState =
  | 'none'
  | 'fresh'
  | 'stale'
  | 'checking'
  | 'unreachable'

interface FreshnessInput {
  hasReading: boolean
  ageSeconds: number | null
  staleSeconds: number
  /** The last request to the server failed. */
  unreachable: boolean
  /** A check started when the person came back to the tab is running. */
  checking: boolean
}

/** What the page should tell about the age of the newest sensor reading. */
export function deriveFreshness(input: FreshnessInput): FreshnessState {
  if (!input.hasReading) return input.unreachable ? 'unreachable' : 'none'
  if (input.unreachable) return 'unreachable'
  if (input.ageSeconds !== null && input.ageSeconds > input.staleSeconds) {
    return input.checking ? 'checking' : 'stale'
  }
  return 'fresh'
}

/** "Ringkasan … · Diperbarui 3 detik lalu", or the plain subtitle. */
export function freshnessSubtitle(
  subtitle: string,
  state: FreshnessState,
  ageSeconds: number | null
): string {
  if (state === 'checking') return `${subtitle} · ${id.state.checking}`
  if (state === 'none' || ageSeconds === null) return subtitle
  return `${subtitle} · ${id.state.updated} ${formatAgeSeconds(ageSeconds)}`
}
