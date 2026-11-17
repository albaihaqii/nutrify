import { type Severity } from '@/components/severity-badge'

export type AdvisorAdvice = {
  severity: Severity
  title: string
  cause: string
  steps: string[]
  source: string
  minutesAgo: number
}

// Dummy data until the advisor API exists.
export const latestAdvice: AdvisorAdvice = {
  severity: 'warning',
  title: 'Pantau L3: indikasi kekurangan nitrogen',
  cause:
    'daun L3 menguning dan model C4.5 menilai Defisiensi N (88%), sementara pH dan EC tandon masih ideal.',
  steps: [
    'Periksa konsentrasi larutan nutrisi dan catat hasilnya.',
    'Bandingkan foto L3 dengan lubang Normal di dekatnya.',
    'Pantau lagi setelah 24 jam sebelum mengubah apa pun.',
  ],
  source: 'Penasihat (LLM)',
  minutesAgo: 12,
}
