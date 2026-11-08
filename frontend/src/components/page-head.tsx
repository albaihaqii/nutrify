type PageHeadProps = {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHead({ title, description, children }: PageHeadProps) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>{title}</h1>
        {description && <p className='text-muted-foreground'>{description}</p>}
      </div>
      {children}
    </div>
  )
}
