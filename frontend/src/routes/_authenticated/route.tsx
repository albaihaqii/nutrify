import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated, useAuthStore } from '@/stores/auth-store'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ location }) => {
    if (!isAuthenticated()) {
      useAuthStore.getState().auth.reset()
      throw redirect({
        to: '/sign-in',
        search: location.href === '/' ? {} : { redirect: location.href },
      })
    }
  },
  component: AuthenticatedLayout,
})
