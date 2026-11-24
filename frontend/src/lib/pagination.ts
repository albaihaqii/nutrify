type PageItem = number | 'gap'

/**
 * The page buttons to show: the first and last page, the current one and its
 * neighbours. A hole of one page shows that page; a longer hole shows a gap.
 */
export function pageItems(current: number, count: number): PageItem[] {
  const wanted = new Set([1, count, current - 1, current, current + 1])
  const pages = [...wanted]
    .filter((page) => page >= 1 && page <= count)
    .sort((a, b) => a - b)

  const items: PageItem[] = []
  pages.forEach((page, index) => {
    const previous = pages[index - 1]
    if (previous !== undefined && page - previous === 2)
      items.push(previous + 1)
    else if (previous !== undefined && page - previous > 2) items.push('gap')
    items.push(page)
  })
  return items
}
