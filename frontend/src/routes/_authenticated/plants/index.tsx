import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Plants } from '@/features/plants'

const searchSchema = z.object({
  plant: z.string().optional().catch(undefined),
})

export const Route = createFileRoute('/_authenticated/plants/')({
  validateSearch: searchSchema,
  component: Plants,
})
