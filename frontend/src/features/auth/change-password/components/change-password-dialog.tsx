import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { id } from '@/locales/id'
import { Loader2 } from 'lucide-react'
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  changePassword,
  getChangePasswordFailure,
} from '../change-password'

const copy = id.auth.changePassword

const schema = z
  .object({
    currentPassword: z.string().min(1, copy.errors.currentRequired),
    newPassword: z
      .string()
      .min(PASSWORD_MIN_LENGTH, copy.errors.newTooShort)
      .max(PASSWORD_MAX_LENGTH, copy.errors.newTooLong),
    confirmPassword: z.string().min(1, copy.errors.confirmRequired),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: copy.errors.mismatch,
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: copy.errors.sameAsCurrent,
  })

type FormValues = z.infer<typeof schema>

const DEFAULTS: FormValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

interface ChangePasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
}: ChangePasswordDialogProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULTS,
  })
  const { isSubmitting } = form.formState

  function handleOpenChange(next: boolean) {
    if (!next) form.reset(DEFAULTS)
    onOpenChange(next)
  }

  async function onSubmit(values: FormValues) {
    try {
      await changePassword(values.currentPassword, values.newPassword)
      toast.success(copy.success)
      handleOpenChange(false)
    } catch (error) {
      const failure = getChangePasswordFailure(error)
      if (failure.field) {
        form.setError(failure.field, { message: failure.message })
      } else {
        toast.error(failure.message)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='change-password-form'
            noValidate
            onSubmit={form.handleSubmit(onSubmit)}
            className='flex flex-col gap-4'
          >
            <FormField
              control={form.control}
              name='currentPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.current}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete='current-password'
                      showLabel={id.auth.showPassword}
                      hideLabel={id.auth.hidePassword}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='newPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.new}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete='new-password'
                      showLabel={id.auth.showPassword}
                      hideLabel={id.auth.hidePassword}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='confirmPassword'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{copy.confirm}</FormLabel>
                  <FormControl>
                    <PasswordInput
                      autoComplete='new-password'
                      showLabel={id.auth.showPassword}
                      hideLabel={id.auth.hidePassword}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            onClick={() => handleOpenChange(false)}
          >
            {copy.cancel}
          </Button>
          <Button
            type='submit'
            form='change-password-form'
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className='animate-spin' />}
            {isSubmitting ? copy.submitting : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
