import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS } from '@/config/realtime'
import { id } from '@/locales/id'
import { toast } from 'sonner'
import { type Device } from '../data/devices'
import { deviceErrorMessage } from '../lib/errors'
import {
  createDevice,
  fetchAnalysisInterval,
  fetchDevices,
  rotateDeviceKey,
  updateDevice,
} from './devices-api'

const DEVICES_KEY = ['devices']

// The endpoints are admin only, so callers pass `enabled: false` for viewers.
export function useDevices(enabled: boolean) {
  return useQuery({
    queryKey: DEVICES_KEY,
    queryFn: fetchDevices,
    enabled,
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}

export function useAnalysisInterval(enabled: boolean) {
  return useQuery({
    queryKey: ['settings', 'analysis-interval'],
    queryFn: fetchAnalysisInterval,
    enabled,
    staleTime: 60_000,
  })
}

/** Errors are handled by the caller (inline in the add dialog). */
export function useCreateDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createDevice,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEVICES_KEY }),
    // Replaces the app-wide default toast, which is not in Indonesian.
    onError: () => undefined,
  })
}

interface DeviceChanges {
  id: number
  name?: string
  isActive?: boolean
}

export function useUpdateDevice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id: deviceId, ...changes }: DeviceChanges) =>
      updateDevice(deviceId, changes),
    onSuccess: (device, variables) => {
      queryClient.setQueryData<Device[]>(DEVICES_KEY, (devices) =>
        devices?.map((item) => (item.id === device.id ? device : item))
      )
      void queryClient.invalidateQueries({ queryKey: DEVICES_KEY })
      if (variables.isActive !== undefined) {
        toast.success(
          variables.isActive
            ? id.devices.toast.activated
            : id.devices.toast.deactivated
        )
      }
    },
    onError: (error) => toast.error(deviceErrorMessage(error)),
  })
}

export function useRotateKey() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: rotateDeviceKey,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DEVICES_KEY }),
    onError: (error) => toast.error(deviceErrorMessage(error)),
  })
}
