import { createFileRoute } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/advisor/')({
  component: () => (
    <PagePlaceholder
      title={id.nav.items.advisor}
      description={id.pages.advisor}
    />
  ),
})
