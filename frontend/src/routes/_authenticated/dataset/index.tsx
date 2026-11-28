import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { plantIds } from '@/lib/plants'
import { Dataset } from '@/features/dataset'
import { labelFilters, statusFilters } from '@/features/dataset/data/dataset'

const searchSchema = z.object({
  label: z.enum(labelFilters).default('unlabeled').catch('unlabeled'),
  plant: z.enum(plantIds).optional().catch(undefined),
  status: z.enum(statusFilters).optional().catch(undefined),
  page: z.number().int().min(1).default(1).catch(1),
})

export const Route = createFileRoute('/_authenticated/dataset/')({
  validateSearch: searchSchema,
  component: Dataset,
})
