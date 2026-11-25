// An <img> tag cannot send the Authorization header, so the token goes in the
// query string (docs/API.md, section 1.2).
function cameraUrl(path: string, token: string): string {
  return `${import.meta.env.VITE_API_BASE_URL}/camera/${path}token=${encodeURIComponent(token)}`
}

/** The live MJPEG stream. */
export function cameraStreamUrl(token: string): string {
  return cameraUrl('stream?', token)
}

/** The latest frame as one picture. `version` makes the browser fetch it again. */
export function cameraSnapshotUrl(token: string, version: number): string {
  return `${cameraUrl('snapshot?', token)}&v=${version}`
}
