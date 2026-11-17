import { describe, expect, it } from 'vitest'
import { sidebarData } from './data/sidebar-data'
import { filterNavGroups } from './nav-groups'
import { type NavGroup } from './types'

const groups: NavGroup[] = [
  { title: 'A', items: [{ title: 'Open', url: '/dashboard' }] },
  {
    title: 'B',
    items: [{ title: 'Secret', url: '/devices', adminOnly: true }],
  },
]

function titles(result: NavGroup[]) {
  return result.flatMap((group) => group.items.map((item) => item.title))
}

describe('filterNavGroups', () => {
  it('keeps admin-only items for admins', () => {
    expect(titles(filterNavGroups(groups, 'admin'))).toEqual(['Open', 'Secret'])
  })

  it('hides admin-only items from viewers', () => {
    expect(titles(filterNavGroups(groups, 'viewer'))).toEqual(['Open'])
  })

  it('hides admin-only items while the role is unknown', () => {
    expect(titles(filterNavGroups(groups, undefined))).toEqual(['Open'])
  })

  it('drops a group that has no visible items left', () => {
    expect(filterNavGroups(groups, 'viewer').map((g) => g.title)).toEqual(['A'])
  })

  it('hides the Perangkat page from viewers in the real sidebar', () => {
    const urls = filterNavGroups(sidebarData.navGroups, 'viewer').flatMap(
      (group) => group.items.map((item) => item.url)
    )

    expect(urls).not.toContain('/devices')
    expect(urls).toContain('/settings')
  })
})
