import { describe, expect, it } from 'vitest'
import { cameraSnapshotUrl, cameraStreamUrl } from './camera-url'

describe('camera URLs', () => {
  it('put the token in the query string, encoded', () => {
    expect(cameraStreamUrl('a b')).toMatch(/\/camera\/stream\?token=a%20b$/)
  })

  it('ask for the frame again when the version changes', () => {
    expect(cameraSnapshotUrl('abc', 2)).toMatch(
      /\/camera\/snapshot\?token=abc&v=2$/
    )
  })
})
