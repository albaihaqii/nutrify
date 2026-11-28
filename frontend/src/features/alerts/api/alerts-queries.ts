import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { REALTIME_INTERVAL_MS } from '@/config/realtime'
import { id } from '@/locales/id'
import { toast } from 'sonner'
import { acknowledgeAlert, fetchOpenAlerts } from './alerts-api'

export function useOpenAlerts(pageSize: number) {
  return useQuery({
    queryKey: ['alerts', 'open', pageSize],
    queryFn: () => fetchOpenAlerts(pageSize),
    refetchInterval: REALTIME_INTERVAL_MS,
  })
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: acknowledgeAlert,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alerts'] }),
    onError: () => toast.error(id.alerts.errors.acknowledge),
  })
}
