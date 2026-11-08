import { createFileRoute } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/sensors/')({
  component: () => (
    <PagePlaceholder
      title={id.nav.items.sensors}
      description={id.pages.sensors}
    />
  ),
})
