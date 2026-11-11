import { type ReactNode } from 'react'
import { id } from '@/locales/id'
import { PageHead } from '@/components/page-head'

interface SettingsHeaderProps {
  actions?: ReactNode
}

export function SettingsHeader({ actions }: SettingsHeaderProps) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <PageHead
        title={id.nav.items.settings}
        description={id.settings.subtitle}
      />
      {actions && <div className='flex gap-2'>{actions}</div>}
    </div>
  )
}
