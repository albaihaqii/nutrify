export const deviceTypes = ['sensor_node', 'webcam'] as const
export type DeviceType = (typeof deviceTypes)[number]

export type DeviceStatus = 'online' | 'offline' | 'never_seen'

export interface Device {
  id: number
  /** Lowercase letters, digits and hyphens, 3 to 50 characters. */
  code: string
  name: string
  type: DeviceType
  firmwareVersion: string | null
  /** ISO timestamp, null when the device never contacted the API. */
  lastSeenAt: string | null
  isActive: boolean
  /** Derived by the backend from the last-seen time. */
  status: DeviceStatus
}

export interface NewDevice {
  code: string
  name: string
  type: DeviceType
}

/** Returned when a key is created or rotated. Shown only once. */
export interface DeviceKey {
  id: number
  code: string
  /** Null for a webcam, which has no key. */
  apiKey: string | null
}

export interface RevealedKey {
  deviceName: string
  apiKey: string
}

export const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/
