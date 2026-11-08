import { z } from 'zod'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { isAuthenticated } from '@/stores/auth-store'
import { SignIn } from '@/features/auth/sign-in'

const searchSchema = z.object({
  redirect: z.string().optional(),
})

export const Route = createFileRoute('/(auth)/sign-in')({
  beforeLoad: () => {
    if (isAuthenticated()) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: SignIn,
  validateSearch: searchSchema,
})
