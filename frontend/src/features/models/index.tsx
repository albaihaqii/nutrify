import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'
import { ComparisonCard } from './components/comparison-card'
import { ConfusionCard } from './components/confusion-card'
import { PredictCard } from './components/predict-card'
import { TreeCard } from './components/tree-card'

export function Models() {
  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead title={id.models.title} description={id.models.subtitle} />

      <ComparisonCard />

      <div className='grid grid-cols-1 gap-4 @3xl/content:grid-cols-2'>
        <ConfusionCard />
        <TreeCard />
      </div>

      <PredictCard />
    </Main>
  )
}
