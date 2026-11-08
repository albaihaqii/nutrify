import { createFileRoute } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/plants/')({
  component: () => (
    <PagePlaceholder
      title={id.nav.items.plants}
      description={id.pages.plants}
    />
  ),
})
