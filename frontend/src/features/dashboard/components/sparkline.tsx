type SparklineProps = {
  values: number[]
  range: [number, number]
}

const WIDTH = 72
const HEIGHT = 28

export function Sparkline({ values, range: [min, max] }: SparklineProps) {
  const points = values
    .map((value, index) => {
      const x = (index * WIDTH) / (values.length - 1)
      const y = 26 - ((value - min) / (max - min)) * 24
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      aria-hidden='true'
      className='shrink-0 text-primary'
    >
      <polyline
        points={points}
        fill='none'
        stroke='currentColor'
        strokeWidth={1.75}
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  )
}
