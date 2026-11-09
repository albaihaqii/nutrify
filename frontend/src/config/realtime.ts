/** How often live sensor panels refetch from the API. */
export const REALTIME_INTERVAL_MS = 5_000

/** How often slower-changing panels (detections, advice, alerts) refetch. */
export const REFRESH_INTERVAL_MS = 30_000

/** Sensor data older than this is shown as stale. */
export const STALE_AFTER_MS = 2 * 60_000
