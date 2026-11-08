import { AdvisorCard } from './advisor-card'
import { AlertsCard } from './alerts-card'
import { DailyConditionsChart } from './daily-conditions-chart'

export function InsightSection() {
  return (
    <section className='grid grid-cols-1 gap-6 @3xl/content:grid-cols-2 @5xl/content:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]'>
      <DailyConditionsChart />
      <AdvisorCard />
      <AlertsCard />
    </section>
  )
}
