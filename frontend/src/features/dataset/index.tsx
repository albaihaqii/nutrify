import { getRouteApi } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { useAuthStore } from '@/stores/auth-store'
import { timestampedFilename } from '@/lib/csv'
import { downloadTextFile } from '@/lib/download'
import { ExportCsvButton } from '@/components/export-csv-button'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { fetchDatasetCsv } from './api/dataset-api'
import { useSnapshots } from './api/dataset-queries'
import { SnapshotsCard } from './components/snapshots-card'
import { SummaryTiles } from './components/summary-tiles'
import { type SnapshotFilterPatch, type SnapshotFilters } from './data/dataset'

const route = getRouteApi('/_authenticated/dataset/')

export function Dataset() {
  const isAdmin = useAuthStore((state) => state.auth.user?.role === 'admin')
  const search = route.useSearch()
  const navigate = route.useNavigate()

  const filters: SnapshotFilters = {
    label: search.label,
    plant: search.plant,
    status: search.status,
    page: search.page,
  }
  const query = useSnapshots(filters)

  // Filters and page live in the URL, so a view can be shared or reloaded.
  function handleFilterChange(patch: SnapshotFilterPatch) {
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

  async function handleExport() {
    const csv = await fetchDatasetCsv()
    downloadTextFile(
      timestampedFilename('nutrify-dataset'),
      csv,
      'text/csv;charset=utf-8'
    )
  }

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <PageHead
          title={id.nav.items.dataset}
          description={id.dataset.subtitle}
        />
        {isAdmin && <ExportCsvButton onExport={handleExport} />}
      </div>

      <SummaryTiles />

      <SnapshotsCard
        filters={filters}
        query={query}
        canLabel={isAdmin}
        onFilterChange={handleFilterChange}
        onPageChange={handlePageChange}
      />
    </Main>
  )
}
