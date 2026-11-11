import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { id } from '@/locales/id'
import { toast } from 'sonner'
import { type SettingsValues } from '../data/settings'
import { settingsErrorMessage } from '../lib/errors'
import { fetchSettings, updateSettings } from './settings-api'

const SETTINGS_KEY = ['settings']

export function useSettings() {
  return useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchSettings })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSettings,
    onSuccess: (settings: SettingsValues) => {
      queryClient.setQueryData(SETTINGS_KEY, settings)
      // The Devices page reads the analysis interval under this key.
      void queryClient.invalidateQueries({
        queryKey: [...SETTINGS_KEY, 'analysis-interval'],
      })
      toast.success(id.settings.toast.saved)
    },
    onError: (error) => toast.error(settingsErrorMessage(error)),
  })
}
