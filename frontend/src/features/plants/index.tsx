import { useEffect } from 'react'
import { getRouteApi } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/empty-state'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { QueryBoundary } from '@/components/query-boundary'
import { usePlantList } from './api/plants-queries'
import { PlantCard } from './components/plant-card'
import { PlantDetailCard } from './components/plant-detail'
import { type PlantSummary } from './data/plants'

const route = getRouteApi('/_authenticated/plants/')

const GRID =
  'grid grid-cols-1 gap-6 @xl/content:grid-cols-2 @3xl/content:grid-cols-3'

function PlantsSkeleton() {
  return (
    <div className={GRID} aria-hidden='true'>
      {Array.from({ length: 6 }, (_, index) => (
        <Card key={index} className='gap-0 p-0 shadow-none'>
          <Skeleton className='h-[262px] rounded-xl' />
        </Card>
      ))}
    </div>
  )
}

function PlantsBody({ plants }: { plants: PlantSummary[] }) {
  const { plant } = route.useSearch()
  const navigate = route.useNavigate()

  // Nothing is selected until the user picks a plant (or opens a link that
  // names one, like the Detail button on the dashboard).
  const selectedId = plants.find((item) => item.id === plant)?.id

  useEffect(() => {
    if (!selectedId) return
    document
      .getElementById('plant-detail')
      ?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [selectedId])

  function handleSelect(plantId: string) {
    // Clicking the selected plant again closes the detail.
    void navigate({
      search: plantId === selectedId ? {} : { plant: plantId },
      replace: true,
      resetScroll: false,
    })
  }

  function handleClose() {
    void navigate({ search: {}, replace: true, resetScroll: false })
  }

  return (
    <>
      <section aria-label={id.plants.listLabel} className={GRID}>
        {plants.map((item) => (
          <PlantCard
            key={item.id}
            plant={item}
            selected={item.id === selectedId}
            onSelect={handleSelect}
          />
        ))}
      </section>
      {selectedId && (
        <PlantDetailCard plantId={selectedId} onClose={handleClose} />
      )}
    </>
  )
}

export function Plants() {
  const query = usePlantList()

  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead title={id.nav.items.plants} description={id.plants.subtitle} />

      <QueryBoundary
        query={query}
        skeleton={<PlantsSkeleton />}
        empty={{
          when: (plants) => plants.length === 0,
          view: <EmptyState title={id.plants.empty} />,
        }}
      >
        {(plants) => <PlantsBody plants={plants} />}
      </QueryBoundary>
    </Main>
  )
}
