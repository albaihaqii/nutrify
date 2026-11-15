import { getRouteApi } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { useAuthStore } from '@/stores/auth-store'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { useAdvicePage } from './api/advice-queries'
import { FallbackBanner } from './components/fallback-banner'
import { HistoryCard } from './components/history-card'
import { RulesCard } from './components/rules-card'
import { type AdviceFilterPatch, type AdviceFilters } from './data/advice'

const route = getRouteApi('/_authenticated/advisor/')

export function Advisor() {
  const isAdmin = useAuthStore((state) => state.auth.user?.role === 'admin')
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const filters: AdviceFilters = {
    source: search.source,
    plant: search.plant,
    page: search.page,
  }
  const query = useAdvicePage(filters)

  // Filters and page live in the URL, so a view can be shared or reloaded.
  function handleFilterChange(patch: AdviceFilterPatch) {
    void navigate({
      search: (previous) => ({ ...previous, ...patch, page: 1 }),
      replace: true,
      resetScroll: false,
    })
  }

  function handlePageChange(page: number) {
    void navigate({
      search: (previous) => ({ ...previous, page }),
      replace: true,
      resetScroll: false,
    })
  }

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead title={id.advisor.title} description={id.advisor.subtitle} />

      <FallbackBanner />

      <HistoryCard
        filters={filters}
        query={query}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
      />

      <RulesCard canEdit={isAdmin} />
    </Main>
  )
}
