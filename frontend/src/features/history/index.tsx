import { getRouteApi } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { useObservationHistory } from './api/history-queries'
import { AdviceHistoryCard } from './components/advice-history-card'
import { ObservationsTableCard } from './components/observations-table-card'
import { type FilterPatch, type ObservationFilters } from './data/history'

const route = getRouteApi('/_authenticated/history/')

export function HistoryView() {
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const filters: ObservationFilters = {
    range: search.range,
    plant: search.plant,
    status: search.status,
    page: search.page,
  }
  const query = useObservationHistory(filters)

  // Filters and page live in the URL, so a view can be shared or reloaded.
  function handleFilterChange(patch: FilterPatch) {
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
      <PageHead
        title={id.nav.items.history}
        description={id.history.subtitle}
      />
      <ObservationsTableCard
        filters={filters}
        query={query}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
      />
      <AdviceHistoryCard />
    </Main>
  )
}
