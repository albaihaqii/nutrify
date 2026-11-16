import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Advisor } from '@/features/advisor'
import { sourceFilters } from '@/features/advisor/data/advice'
import { plantIds } from '@/features/dataset/data/dataset'

const searchSchema = z.object({
  source: z.enum(sourceFilters).default('all').catch('all'),
  plant: z.enum(plantIds).optional().catch(undefined),
  page: z.number().int().min(1).default(1).catch(1),
})

export const Route = createFileRoute('/_authenticated/advisor/')({
  validateSearch: searchSchema,
  component: Advisor,
})
