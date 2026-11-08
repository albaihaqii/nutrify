import { ModelAccuracyCard } from './model-accuracy-card'
import { ObservationsCard } from './observations-card'

export function RecordsSection() {
  return (
    <section className='grid grid-cols-1 gap-6 @5xl/content:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
      <ObservationsCard />
      <ModelAccuracyCard />
    </section>
  )
}
