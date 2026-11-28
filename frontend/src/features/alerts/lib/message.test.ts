import { describe, expect, it } from 'vitest'
import { type AlertItem } from '../data/alerts'
import { alertMessage } from './message'

function alert(overrides: Partial<AlertItem>): AlertItem {
  return {
    id: 1,
    code: 'sensor_out_of_range',
    severity: 'warning',
    params: {},
    plantPosition: null,
    createdAt: '2026-11-28T03:00:00.000Z',
    acknowledged: false,
    ...overrides,
  }
}

describe('alertMessage', () => {
  it('names the value, the side and the ideal range of a sensor', () => {
    expect(
      alertMessage(
        alert({
          params: {
            metric: 'ph',
            value: 7.1,
            min: 5.5,
            max: 6.5,
            side: 'high',
          },
        })
      )
    ).toBe('pH 7,1 di atas rentang ideal 5,5 sampai 6,5')
    expect(
      alertMessage(
        alert({
          params: { metric: 'ec', value: 1.2, min: 1.5, max: 2, side: 'low' },
        })
      )
    ).toBe('EC 1,20 mS/cm di bawah rentang ideal 1,50 sampai 2,00 mS/cm')
  })

  it('names the hole and the deficiency', () => {
    expect(
      alertMessage(
        alert({
          code: 'plant_deficiency',
          plantPosition: 3,
          params: { status: 'n_deficiency' },
        })
      )
    ).toBe('Lubang L3: Defisiensi N')
  })

  it('tells that the webcam sends no pictures', () => {
    expect(alertMessage(alert({ code: 'device_offline' }))).toBe(
      'Webcam tidak mengirim gambar'
    )
  })

  it('tells how long the sensor has been quiet at least', () => {
    expect(
      alertMessage(
        alert({ code: 'sensor_stale', params: { stale_seconds: 120 } })
      )
    ).toBe('Sensor tidak mengirim data lebih dari 2 menit')
  })

  it('does not break on parameters it does not know', () => {
    expect(alertMessage(alert({ params: { metric: 'salinity' } }))).toBe(
      'Ada kondisi yang perlu diperhatikan'
    )
    expect(
      alertMessage(alert({ code: 'plant_deficiency', plantPosition: 9 }))
    ).toBe('Ada kondisi yang perlu diperhatikan')
  })
})
