import { createFileRoute } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { PagePlaceholder } from '@/components/page-placeholder'

export const Route = createFileRoute('/_authenticated/live/')({
  component: () => (
    <PagePlaceholder
      title={id.nav.items.liveCamera}
      description={id.pages.liveCamera}
    />
  ),
})
