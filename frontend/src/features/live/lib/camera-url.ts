/**
 * Address of the live stream. An <img> tag cannot send the Authorization header, so the token
 * goes in the query string (docs/API.md, section 1.2).
 */
export function cameraStreamUrl(token: string): string {
  return `${import.meta.env.VITE_API_BASE_URL}/camera/stream?token=${encodeURIComponent(token)}`
}
