import { id } from '@/locales/id'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { type RevealedKey } from '../data/devices'

interface KeyRevealDialogProps {
  reveal: RevealedKey | null
  onClose: () => void
}

/**
 * The only moment a key can be read: the backend stores a hash only.
 * It closes only through the Done button, so the key is not lost by accident.
 */
export function KeyRevealDialog({ reveal, onClose }: KeyRevealDialogProps) {
  async function handleCopy(apiKey: string) {
    try {
      await navigator.clipboard.writeText(apiKey)
      toast.success(id.devices.key.copied)
    } catch {
      toast.error(id.devices.key.copyFailed)
    }
  }

  return (
    <Dialog open={reveal !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className='sm:max-w-md'
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
      >
        {reveal && (
          <>
            <DialogHeader>
              <DialogTitle>
                {id.devices.key.newTitle.replace('{name}', reveal.deviceName)}
              </DialogTitle>
              <DialogDescription>{id.devices.key.newDesc}</DialogDescription>
            </DialogHeader>

            <div className='flex gap-2'>
              <Input
                readOnly
                value={reveal.apiKey}
                aria-label={id.devices.key.inputLabel}
                className='font-mono'
                onFocus={(event) => event.currentTarget.select()}
              />
              <Button
                variant='outline'
                onClick={() => void handleCopy(reveal.apiKey)}
              >
                <Copy aria-hidden='true' />
                {id.devices.key.copy}
              </Button>
            </div>

            <DialogFooter>
              <Button onClick={onClose}>{id.devices.key.done}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
