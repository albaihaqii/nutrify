import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { Dataset } from '@/features/dataset'
import {
  labelFilters,
  plantIds,
  predictionFilters,
} from '@/features/dataset/data/dataset'

const searchSchema = z.object({
  label: z.enum(labelFilters).catch('unlabeled'),
  plant: z.enum(plantIds).optional().catch(undefined),
  predicted: z.enum(predictionFilters).optional().catch(undefined),
  page: z.number().int().min(1).catch(1),
})

export const Route = createFileRoute('/_authenticated/dataset/')({
  validateSearch: searchSchema,
  component: Dataset,
})
