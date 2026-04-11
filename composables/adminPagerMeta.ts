/** Map Laravel paginator JSON to AdminPager props. */
export function laravelPageMeta(
  payload: {
    current_page?: number
    per_page?: number
    last_page?: number
    total?: number
  } | null | undefined
) {
  if (!payload) {
    return { page: 1, pageSize: 15, lastPage: 1, total: 0 }
  }
  const pageSize = payload.per_page ?? 15
  const total = payload.total ?? 0
  let lastPage = payload.last_page
  if (lastPage == null && total > 0 && pageSize > 0) {
    lastPage = Math.max(1, Math.ceil(total / pageSize))
  }
  if (lastPage == null) {
    lastPage = 1
  }
  return {
    page: payload.current_page ?? 1,
    pageSize,
    lastPage,
    total
  }
}
