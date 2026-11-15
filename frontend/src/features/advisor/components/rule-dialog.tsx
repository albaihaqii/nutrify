import { useState, type FormEvent } from 'react'
import { id } from '@/locales/id'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateRule } from '../api/advice-queries'
import { type FallbackRule } from '../data/advice'
import {
  MAX_ACTIONS,
  actionsToText,
  parseActions,
  sameActions,
  validateActions,
} from '../lib/rule-form'

interface RuleDialogProps {
  rule: FallbackRule
  /** The condition as a sentence; it is shown, never edited. */
  condition: string
  onClose: () => void
}

export function RuleDialog({ rule, condition, onClose }: RuleDialogProps) {
  const update = useUpdateRule()
  const [text, setText] = useState(() => actionsToText(rule.suggestedActions))
  const [error, setError] = useState<string | null>(null)

  const unchanged = sameActions(parseActions(text), rule.suggestedActions)

  function handleChange(value: string) {
    setText(value)
    setError(null)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const actions = parseActions(text)
    const problem = validateActions(actions)
    if (problem !== null) {
      setError(problem)
      return
    }
    update.mutate({ code: rule.code, actions }, { onSuccess: onClose })
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <form
          onSubmit={handleSubmit}
          noValidate
          className='flex flex-col gap-4'
        >
          <DialogHeader>
            <DialogTitle>{id.advisor.dialog.title}</DialogTitle>
            <DialogDescription>
              {id.advisor.dialog.condition.replace('{condition}', condition)}
            </DialogDescription>
          </DialogHeader>

          <div className='flex flex-col gap-1.5'>
            <Label htmlFor='rule-actions' className='text-[13px] font-semibold'>
              {id.advisor.dialog.actions}
            </Label>
            <Textarea
              id='rule-actions'
              rows={5}
              value={text}
              aria-invalid={error !== null}
              aria-describedby={
                error ? 'rule-actions-error' : 'rule-actions-hint'
              }
              onChange={(event) => handleChange(event.target.value)}
            />
            {error ? (
              <p id='rule-actions-error' className='text-xs text-destructive'>
                {error}
              </p>
            ) : (
              <p
                id='rule-actions-hint'
                className='text-xs text-muted-foreground'
              >
                {id.advisor.dialog.hint.replace('{max}', String(MAX_ACTIONS))}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type='button' variant='outline' onClick={onClose}>
              {id.advisor.dialog.cancel}
            </Button>
            <Button type='submit' disabled={update.isPending || unchanged}>
              {id.advisor.dialog.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
