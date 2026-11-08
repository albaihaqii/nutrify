import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { useSearch } from '@/context/search-provider'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { sidebarData } from './layout/data/sidebar-data'

export function CommandMenu() {
  const navigate = useNavigate()
  const { open, setOpen } = useSearch()

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false)
      command()
    },
    [setOpen]
  )

  return (
    <CommandDialog
      modal
      open={open}
      onOpenChange={setOpen}
      title={id.search.title}
      description={id.search.description}
    >
      <CommandInput placeholder={id.header.searchPlaceholder} />
      <CommandList>
        <CommandEmpty>{id.search.empty}</CommandEmpty>
        {sidebarData.navGroups.map((group) => (
          <CommandGroup key={group.title} heading={group.title}>
            {group.items.map((item) => {
              if (!item.url) return null
              const url = item.url
              const Icon = item.icon
              return (
                <CommandItem
                  key={item.title}
                  value={item.title}
                  onSelect={() => runCommand(() => navigate({ to: url }))}
                >
                  {Icon && <Icon />}
                  {item.title}
                </CommandItem>
              )
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  )
}
