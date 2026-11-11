const quote = (value: string | number) =>
  `"${String(value).replace(/"/g, '""')}"`

/** CSV with a BOM so Excel reads UTF-8 text (like the ° sign) correctly. */
export function buildCsv(
  header: string[],
  lines: Array<Array<string | number>>
): string {
  const rows: Array<Array<string | number>> = [header, ...lines]
  return `\uFEFF${rows.map((row) => row.map(quote).join(',')).join('\r\n')}`
}

const pad = (value: number) => String(value).padStart(2, '0')

/** "prefix-20261110-2041.csv" in the viewer's local time. */
export function timestampedFilename(
  prefix: string,
  now: Date = new Date()
): string {
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`
  return `${prefix}-${day}-${time}.csv`
}
