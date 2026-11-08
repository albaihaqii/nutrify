import { useEffect } from 'react'
import { id } from '@/locales/id'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/context/theme-provider'
import { Button } from '@/components/ui/button'

export function ThemeSwitch() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    const metaThemeColor = document.querySelector("meta[name='theme-color']")
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDark ? '#0F1512' : '#F5F6F3')
    }
  }, [isDark])

  return (
    <Button
      variant='ghost'
      size='icon'
      className='scale-95 rounded-full'
      aria-label={id.header.toggleTheme}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {isDark ? (
        <Moon className='size-[1.2rem]' />
      ) : (
        <Sun className='size-[1.2rem]' />
      )}
    </Button>
  )
}
