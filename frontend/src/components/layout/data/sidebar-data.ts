import { id } from '@/locales/id'
import { LayoutDashboard, Sprout } from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin',
    email: 'admin@nutrify.id',
    avatar: '',
  },
  teams: [
    {
      name: id.app.name,
      logo: Sprout,
      plan: id.app.tagline,
    },
  ],
  navGroups: [
    {
      title: id.nav.groups.monitoring,
      items: [
        {
          title: id.nav.dashboard,
          url: '/',
          icon: LayoutDashboard,
        },
      ],
    },
  ],
}
