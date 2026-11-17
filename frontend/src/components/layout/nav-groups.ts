import { useMemo } from 'react'
import { useAuthStore, type UserRole } from '@/stores/auth-store'
import { sidebarData } from './data/sidebar-data'
import { type NavGroup } from './types'

/** Drops admin-only items unless the user is an admin, then drops empty groups. */
export function filterNavGroups(
  groups: NavGroup[],
  role: UserRole | undefined
): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.adminOnly || role === 'admin'),
    }))
    .filter((group) => group.items.length > 0)
}

/** The sidebar and command menu entries the signed-in user may see. */
export function useNavGroups(): NavGroup[] {
  const role = useAuthStore((state) => state.auth.user?.role)

  return useMemo(() => filterNavGroups(sidebarData.navGroups, role), [role])
}
