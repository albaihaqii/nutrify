import { z } from 'zod'
import { createFileRoute } from '@tanstack/react-router'
import { HistoryView } from '@/features/history'
import {
  historyRanges,
  plantIds,
  statusFilters,
} from '@/features/history/data/history'

const searchSchema = z.object({
  range: z.enum(historyRanges).catch('7d'),
  plant: z.enum(plantIds).optional().catch(undefined),
  status: z.enum(statusFilters).optional().catch(undefined),
  page: z.number().int().min(1).catch(1),
})

export const Route = createFileRoute('/_authenticated/history/')({
  validateSearch: searchSchema,
  component: HistoryView,
})
