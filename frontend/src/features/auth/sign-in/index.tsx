import { useSearch } from '@tanstack/react-router'
import { id } from '@/locales/id'
import { Leaf } from 'lucide-react'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })

  return (
    <div className='flex min-h-svh items-center justify-center px-6 py-14'>
      <div className='flex w-full max-w-100 flex-col gap-5 rounded-xl border bg-card p-8'>
        <div className='flex flex-col items-center gap-2.5 text-center'>
          <span className='grid size-12 place-items-center rounded-[13px] bg-primary text-primary-foreground'>
            <Leaf className='size-[26px]' />
          </span>
          <h1 className='text-[22px] font-bold tracking-[-0.01em]'>
            {id.app.name}
          </h1>
          <p className='text-muted-foreground'>{id.auth.subtitle}</p>
        </div>
        <UserAuthForm redirectTo={redirect} />
        <p className='text-center text-xs text-muted-foreground'>
          {id.auth.restricted}
        </p>
      </div>
    </div>
  )
}
