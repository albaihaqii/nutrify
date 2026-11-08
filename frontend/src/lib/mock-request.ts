export type MockScenario = 'loading' | 'error' | 'stale' | 'empty' | 'offline'

const SCENARIOS: MockScenario[] = [
  'loading',
  'error',
  'stale',
  'empty',
  'offline',
]

/** Reads ?mock=... from the URL. Only works in development. */
export function getMockScenario(): MockScenario | null {
  if (!import.meta.env.DEV) return null
  const value = new URLSearchParams(window.location.search).get('mock')
  return SCENARIOS.find((scenario) => scenario === value) ?? null
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * Resolves with dummy data like an API would. Real endpoints replace the
 * call to this function, nothing else.
 */
export async function mockRequest<T>(data: T, emptyData?: T): Promise<T> {
  const scenario = getMockScenario()

  await wait(scenario === 'loading' ? 60_000 : 400)

  if (scenario === 'error') throw new Error('Mock request failed')
  if (scenario === 'empty' && emptyData !== undefined) return emptyData
  return data
}
