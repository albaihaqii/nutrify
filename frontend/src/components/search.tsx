import { id } from '@/locales/id'
import { SearchIcon } from 'lucide-react'
import { useSearch } from '@/context/search-provider'
import { Button } from '@/components/ui/button'

export function Search() {
  const { setOpen } = useSearch()

  return (
    <Button
      variant='outline'
      className='group relative h-8 w-full flex-1 justify-start rounded-md bg-muted/25 text-sm font-normal text-muted-foreground shadow-none hover:bg-accent sm:w-40 sm:flex-none lg:w-52 xl:w-64'
      aria-keyshortcuts='Meta+K Control+K'
      onClick={() => setOpen(true)}
    >
      <SearchIcon
        aria-hidden='true'
        className='absolute inset-s-1.5 top-1/2 -translate-y-1/2'
        size={16}
      />
      <span className='ms-4'>{id.header.searchPlaceholder}</span>
    </Button>
  )
}
