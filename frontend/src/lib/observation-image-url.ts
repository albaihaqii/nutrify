// An <img> tag cannot send the Authorization header, so the token goes in the
// query string (docs/API.md, section 1.2).
export type ObservationView = 'photo' | 'segmentation'

/** The hole of an observation: the plain photo or the segmentation overlay. */
export function observationImageUrl(
  observationId: number,
  view: ObservationView,
  token: string
): string {
  return `${import.meta.env.VITE_API_BASE_URL}/observations/${observationId}/image?view=${view}&token=${encodeURIComponent(token)}`
}
