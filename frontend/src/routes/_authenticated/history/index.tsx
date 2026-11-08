import { createFileRoute } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/history/')({
  component: () => (
    <PagePlaceholder
      title={id.nav.items.history}
      description={id.pages.history}
    />
  ),
})
