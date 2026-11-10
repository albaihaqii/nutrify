export interface LiveAdvice {
  title: string
  cause: string
  steps: string[]
  /** 'llm' when the advisor answered, 'fallback' when rules were used. */
  source: 'llm' | 'fallback'
}

export const liveAdvice: LiveAdvice = {
  title: 'Pantau L3: indikasi kekurangan nitrogen',
  cause: 'daun L3 menguning, sementara pH dan EC masih ideal.',
  steps: [
    'Periksa konsentrasi larutan nutrisi.',
    'Bandingkan foto L3 dengan lubang Normal.',
    'Pantau lagi setelah 24 jam.',
  ],
  source: 'llm',
}
