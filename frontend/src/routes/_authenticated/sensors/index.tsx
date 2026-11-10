import { createFileRoute } from '@tanstack/react-router'
import { Sensors } from '@/features/sensors'

export const Route = createFileRoute('/_authenticated/sensors/')({
  component: Sensors,
})
