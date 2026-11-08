import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { Loader2, TriangleAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import { getLoginErrorMessage, login } from '../login'

const formSchema = z.object({
  email: z.email({
    error: (iss) =>
      iss.input === ''
        ? id.auth.errors.emailRequired
        : id.auth.errors.emailInvalid,
  }),
  password: z.string().min(1, id.auth.errors.passwordRequired),
})

type FormValues = z.infer<typeof formSchema>

interface UserAuthFormProps {
  redirectTo?: string
}

/** Only same-site paths are accepted as a post-login destination. */
function resolveTarget(redirectTo?: string) {
  if (
    redirectTo &&
    redirectTo.startsWith('/') &&
    !redirectTo.startsWith('//')
  ) {
    return redirectTo
  }
  return '/'
}

export function UserAuthForm({ redirectTo }: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { auth } = useAuthStore()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  })

  const fieldClass = cn('h-10', loginError && 'border-status-high-fg')

  async function onSubmit(values: FormValues) {
    setIsLoading(true)
    setLoginError(null)
    try {
      const session = await login(values.email.trim(), values.password)
      auth.setSession(session)
      await navigate({ to: resolveTarget(redirectTo), replace: true })
    } catch (error) {
      setLoginError(getLoginErrorMessage(error))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className='flex flex-col gap-5'>
      {loginError && (
        <div
          role='alert'
          className='flex items-start gap-2.5 rounded-md bg-status-high-bg p-3 text-status-high-fg'
        >
          <TriangleAlert className='mt-0.5 size-4 shrink-0' />
          <div>
            <strong>{id.auth.errors.title}</strong> {loginError}
          </div>
        </div>
      )}
      <Form {...form}>
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
          className='flex flex-col gap-4'
        >
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem className='gap-1.5'>
                <FormLabel className='text-[13px] font-semibold'>
                  {id.auth.emailLabel}
                </FormLabel>
                <FormControl>
                  <Input
                    type='email'
                    autoComplete='username'
                    placeholder={id.auth.emailPlaceholder}
                    className={fieldClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem className='gap-1.5'>
                <FormLabel className='text-[13px] font-semibold'>
                  {id.auth.passwordLabel}
                </FormLabel>
                <FormControl>
                  <PasswordInput
                    autoComplete='current-password'
                    placeholder={id.auth.passwordPlaceholder}
                    showLabel={id.auth.showPassword}
                    hideLabel={id.auth.hidePassword}
                    inputClassName={fieldClass}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type='submit' className='h-10 w-full' disabled={isLoading}>
            {isLoading && <Loader2 className='animate-spin' />}
            {isLoading ? id.auth.submitting : id.auth.submit}
          </Button>
        </form>
      </Form>
    </div>
  )
}
