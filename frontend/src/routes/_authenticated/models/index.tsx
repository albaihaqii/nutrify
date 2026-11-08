import { createFileRoute } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/models/')({
  component: () => (
    <PagePlaceholder
      title={id.nav.items.models}
      description={id.pages.models}
    />
  ),
})
