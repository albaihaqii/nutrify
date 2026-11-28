import { describe, expect, it } from 'vitest'
import { toAdvicePage, toRule } from './rows'

describe('toAdvicePage', () => {
  it('maps the advice and keeps the paging', () => {
    const page = toAdvicePage({
      items: [
        {
          id: 7,
          created_at: '2026-11-28T03:00:00.000Z',
          plant_position: null,
          severity: 'critical',
          summary: 'Suhu air 29,0 °C di atas rentang ideal.',
          likely_causes: ['Suhu ruangan tinggi'],
          suggested_actions: ['Pindahkan tandon ke tempat teduh'],
          source: 'rules',
          model_name: null,
        },
      ],
      page: 2,
      page_size: 10,
      total: 11,
    })

    expect(page).toEqual({
      rows: [
        {
          id: 7,
          createdAt: '2026-11-28T03:00:00.000Z',
          plantPosition: null,
          severity: 'critical',
          summary: 'Suhu air 29,0 °C di atas rentang ideal.',
          likelyCauses: ['Suhu ruangan tinggi'],
          suggestedActions: ['Pindahkan tandon ke tempat teduh'],
          source: 'rules',
          modelName: null,
        },
      ],
      total: 11,
      page: 2,
      pageSize: 10,
    })
  })
})

describe('toRule', () => {
  it('maps the actions', () => {
    expect(
      toRule({ code: 'needs_check', suggested_actions: ['Periksa'] })
    ).toEqual({ code: 'needs_check', suggestedActions: ['Periksa'] })
  })
})
