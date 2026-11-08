import { PlantMap } from './plant-map'
import { SensorChart } from './sensor-chart'

export function TrendSection() {
  return (
    <section className='grid grid-cols-1 gap-6 @5xl/content:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
      <SensorChart />
      <PlantMap />
    </section>
  )
}
