import { id } from '@/locales/id'
import { Main } from '@/components/layout/main'
import { PageHead } from '@/components/page-head'

type PagePlaceholderProps = {
  title: string
  description: string
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <Main className='flex flex-col gap-6 p-6'>
      <PageHead title={title} description={description} />
      <div className='rounded-xl border border-dashed p-10 text-center text-muted-foreground'>
        {id.pages.placeholder}
      </div>
    </Main>
  )
}
