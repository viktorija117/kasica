/** Supabase returns at most 1000 rows per request, so longer lists are read page by page. */
const PAGE = 1000

export type Page<T> = (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>

/** Every row, page by page; `page` must use a stable order so pages never overlap. */
export async function fetchAll<T>(page: Page<T>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}
