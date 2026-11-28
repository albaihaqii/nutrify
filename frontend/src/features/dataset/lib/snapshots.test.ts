import { describe, expect, it } from 'vitest'
import { type SnapshotsResponse } from '../data/dataset'
import { toDatasetSummary, toSnapshotPage } from './snapshots'

type Item = SnapshotsResponse['items'][number]

function item(changes: Partial<Item> = {}): Item {
  return {
    id: 7,
    plant_position: 3,
    observed_at: '2026-11-28T05:10:00.000Z',
    qc_status: 'ok',
    label_class: null,
    features: { ph: 6.1, ec: 2.2, temperature: 25.5 },
    ...changes,
  }
}

function page(...items: Item[]): SnapshotsResponse {
  return { items, page: 2, page_size: 8, total: 19 }
}

describe('toSnapshotPage', () => {
  it('maps a result and keeps the paging', () => {
    expect(toSnapshotPage(page(item({ label_class: 'normal' })))).toEqual({
      rows: [
        {
          id: 7,
          plantId: 'L3',
          at: '2026-11-28T05:10:00.000Z',
          ph: 6.1,
          ec: 2.2,
          temperature: 25.5,
          qc: 'ok',
          label: 'normal',
        },
      ],
      total: 19,
      page: 2,
      pageSize: 8,
    })
  })

  it('shows a complete-looking result without sensor values as an empty sensor', () => {
    const features = { ph: null, ec: 2.2, temperature: 25.5 }
    expect(toSnapshotPage(page(item({ features }))).rows[0].qc).toBe(
      'stale_sensor'
    )
  })

  it('keeps the other quality flags', () => {
    const rows = toSnapshotPage(
      page(
        item({ qc_status: 'invalid_leaf' }),
        item({ qc_status: 'needs_check' })
      )
    ).rows
    expect(rows.map((row) => row.qc)).toEqual(['invalid_leaf', 'needs_check'])
  })

  it('leaves out a hole or a flag it does not know', () => {
    const rows = toSnapshotPage(
      page(item({ plant_position: 9 }), item({ qc_status: 'other' }), item())
    ).rows
    expect(rows).toHaveLength(1)
  })
})

describe('toDatasetSummary', () => {
  it('renames the fields', () => {
    const byClass = { normal: 5, n_deficiency: 2, fe_deficiency: 1 }
    expect(
      toDatasetSummary({ labeled: 9, usable: 8, by_class: byClass })
    ).toEqual({ labeled: 9, usable: 8, byClass })
  })
})
