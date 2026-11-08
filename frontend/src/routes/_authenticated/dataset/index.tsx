import { createFileRoute } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/dataset/')({
  component: () => (
    <PagePlaceholder
      title={id.nav.items.dataset}
      description={id.pages.dataset}
    />
  ),
})
