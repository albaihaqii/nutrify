import { id } from '@/locales/id'

/** A single item reads as a sentence, several as a bulleted list, none as a dash. */
export function TextList({ items }: { items: string[] }) {
  const [first] = items

  if (first === undefined) {
    return (
      <span className='text-muted-foreground'>{id.advisor.history.none}</span>
    )
  }
  if (items.length === 1) return <>{first}</>

  return (
    <ul className='list-disc space-y-1 pl-4'>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
