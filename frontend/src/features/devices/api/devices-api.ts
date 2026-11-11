import { api } from '@/lib/api'
import {
  type Device,
  type DeviceKey,
  type DeviceStatus,
  type DeviceType,
  type NewDevice,
} from '../data/devices'

// Shapes returned by the backend (docs/API.md, section 13 and 14).
interface DeviceDto {
  id: number
  code: string
  name: string
  type: DeviceType
  firmware_version: string | null
  last_seen_at: string | null
  is_active: boolean
  status: DeviceStatus
}

interface DeviceKeyDto {
  id: number
  code: string
  api_key: string | null
}

function toDevice(dto: DeviceDto): Device {
  return {
    id: dto.id,
    code: dto.code,
    name: dto.name,
    type: dto.type,
    firmwareVersion: dto.firmware_version,
    lastSeenAt: dto.last_seen_at,
    isActive: dto.is_active,
    status: dto.status,
  }
}

function toDeviceKey(dto: DeviceKeyDto): DeviceKey {
  return { id: dto.id, code: dto.code, apiKey: dto.api_key }
}

export async function fetchDevices(): Promise<Device[]> {
  const { data } = await api.get<{ items: DeviceDto[] }>('/devices')
  return data.items.map(toDevice)
}

export async function fetchAnalysisInterval(): Promise<number> {
  const { data } = await api.get<{ analysis_interval_seconds: number }>(
    '/settings'
  )
  return data.analysis_interval_seconds
}

export async function createDevice(input: NewDevice): Promise<DeviceKey> {
  const { data } = await api.post<DeviceKeyDto>('/devices', input)
  return toDeviceKey(data)
}

export async function updateDevice(
  id: number,
  changes: { name?: string; isActive?: boolean }
): Promise<Device> {
  const { data } = await api.patch<DeviceDto>(`/devices/${id}`, {
    name: changes.name,
    is_active: changes.isActive,
  })
  return toDevice(data)
}

export async function rotateDeviceKey(id: number): Promise<DeviceKey> {
  const { data } = await api.post<DeviceKeyDto>(`/devices/${id}/rotate-key`)
  return toDeviceKey(data)
}
