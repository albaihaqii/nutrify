import { id } from '@/locales/id'
import {
  Camera,
  Clock,
  Cpu,
  Database,
  Gauge,
  GitBranch,
  House,
  Leaf,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: {
    name: 'Admin',
    email: 'admin@nutrify.id',
    avatar: '',
  },
  navGroups: [
    {
      title: id.nav.groups.main,
      items: [
        { title: id.nav.items.dashboard, url: '/dashboard', icon: House },
        { title: id.nav.items.liveCamera, url: '/live', icon: Camera },
        { title: id.nav.items.plants, url: '/plants', icon: Leaf },
      ],
    },
    {
      title: id.nav.groups.data,
      items: [
        { title: id.nav.items.sensors, url: '/sensors', icon: Gauge },
        { title: id.nav.items.history, url: '/history', icon: Clock },
        { title: id.nav.items.dataset, url: '/dataset', icon: Database },
      ],
    },
    {
      title: id.nav.groups.intelligence,
      items: [
        { title: id.nav.items.models, url: '/models', icon: GitBranch },
        { title: id.nav.items.advisor, url: '/advisor', icon: Sparkles },
      ],
    },
    {
      title: id.nav.groups.system,
      items: [
        { title: id.nav.items.devices, url: '/devices', icon: Cpu },
        {
          title: id.nav.items.settings,
          url: '/settings',
          icon: SlidersHorizontal,
        },
      ],
    },
  ],
}
