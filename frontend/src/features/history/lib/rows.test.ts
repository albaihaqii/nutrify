import { describe, expect, it } from 'vitest'
import { toExportRows, toObservationPage } from './rows'

describe('toObservationPage', () => {
  it('maps the rows and keeps the paging', () => {
    const page = toObservationPage({
      items: [
        {
          id: 4,
          plant_position: 2,
          observed_at: '2026-11-20T01:00:00.000Z',
          status: 'no_plant',
          confidence: null,
          features: { ph: 6.1, ec: null, temperature: null },
        },
        {
          id: 5,
          plant_position: 8,
          observed_at: '2026-11-20T01:00:00.000Z',
          status: 'normal',
          confidence: 0.7,
          features: { ph: null, ec: null, temperature: null },
        },
      ],
      page: 2,
      page_size: 10,
      total: 31,
    })

    expect(page.rows).toEqual([
      {
        id: 4,
        at: '2026-11-20T01:00:00.000Z',
        plantId: 'L2',
        status: 'none',
        confidence: null,
        ph: 6.1,
        ec: null,
        temperature: null,
      },
    ])
    expect([page.page, page.pageSize, page.total]).toEqual([2, 10, 31])
  })
})

describe('toExportRows', () => {
  it('maps a row of the export', () => {
    expect(
      toExportRows({
        items: [
          {
            observed_at: '2026-11-20T01:00:00.000Z',
            plant_position: 1,
            status: 'fe_deficiency',
            confidence: 0.8,
            ph: 6.1,
            ec: 1.72,
            temperature: 24.6,
          },
        ],
      })
    ).toEqual([
      {
        at: '2026-11-20T01:00:00.000Z',
        plantId: 'L1',
        status: 'fe',
        confidence: 0.8,
        ph: 6.1,
        ec: 1.72,
        temperature: 24.6,
      },
    ])
  })
})
