import { ref, shallowRef, computed, type Ref, type ComputedRef, type ShallowRef } from 'vue'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

/** Meta cho `AdminPager` — cùng shape với `PhotosListPage` / `CategoriesListPage`. */
export type AdminCursorPagerMeta = {
  page: number
  pageSize: number
  lastPage: number
  total: number
}

/** Normalized payload: the row array is always exposed as `items`. */
export type AdminCursorPagePayload<T = unknown> = {
  items: T[]
  nextCursor: string | null
  hasMore: boolean
  chunkSize: number
  totalRecords: number
  totalPages: number
  currentPage: number
}

export type AdminCursorQueryContext<TFilters extends Record<string, unknown>> = {
  page: number
  pageSize: number
  cursors: Record<number, string | undefined>
  filters: TFilters
}

export type UseAdminCursorListOptions<TFilters extends Record<string, unknown>> = {
  /** Filter ref — each screen defines its shape; presets ship a default factory. */
  filters: Ref<TFilters>
  /** Tên field mảng trong `data` API (vd. `photos`, `categories`). */
  itemsKey: string
  initialPageSize?: number
  buildQuery: (ctx: AdminCursorQueryContext<TFilters>) => Record<string, unknown>
  /** Trả về `data` đã unwrap envelope (giống `const { data } = await adminHttp.get(...)`). */
  fetch: (query: Record<string, unknown>) => Promise<unknown>
  onError?: (err: unknown) => void
}

export type UseAdminCursorListReturn<TItem> = {
  loading: Ref<boolean>
  pagePayload: ShallowRef<AdminCursorPagePayload<TItem>>
  rows: ComputedRef<TItem[]>
  pagerMeta: ComputedRef<AdminCursorPagerMeta>
  pageSize: Ref<number>
  lastListPage: Ref<number>
  pageCursors: Ref<Record<number, string | undefined>>
  fetchList: (page?: number) => Promise<void>
  applyFilters: () => Promise<void>
  onPageSize: (s: number) => Promise<void>
  resetPagination: () => void
}

function num(p: Record<string, unknown>, camel: string, snake: string, fallback: number): number {
  const v = p[camel] ?? p[snake]
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function strOrNull(p: Record<string, unknown>, camel: string, snake: string): string | null {
  const v = p[camel] ?? p[snake]
  if (v == null || v === '') {
    return null
  }
  return String(v)
}

function bool(p: Record<string, unknown>, camel: string, snake: string): boolean {
  const v = p[camel] ?? p[snake]
  return Boolean(v)
}

function parseListPayload<TItem>(
  raw: unknown,
  itemsKey: string,
  fallbackPage: number,
  fallbackChunkSize: number
): AdminCursorPagePayload<TItem> {
  const payload
    = raw !== null && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  const itemsRaw = payload[itemsKey]
  const items = Array.isArray(itemsRaw) ? (itemsRaw as TItem[]) : []

  const nextCursor = strOrNull(payload, 'nextCursor', 'next_cursor')
  const hasMore = bool(payload, 'hasMore', 'has_more') || Boolean(nextCursor)
  const chunkSize = Math.max(
    1,
    num(payload, 'chunkSize', 'chunk_size', fallbackChunkSize) || fallbackChunkSize
  )
  const totalRecords = Math.max(0, num(payload, 'totalRecords', 'total_records', 0))
  const currentPage = Math.max(
    1,
    num(payload, 'currentPage', 'current_page', fallbackPage) || fallbackPage
  )
  let totalPages = num(payload, 'totalPages', 'total_pages', 0)
  if (!totalPages || totalPages < 1) {
    totalPages
      = totalRecords > 0 && chunkSize > 0
        ? Math.max(1, Math.ceil(totalRecords / chunkSize))
        : Math.max(1, currentPage + (nextCursor ? 1 : 0))
  }

  return {
    items,
    nextCursor,
    hasMore,
    chunkSize,
    totalRecords,
    totalPages: Math.max(1, totalPages),
    currentPage
  }
}

export function useAdminCursorList<TItem, TFilters extends Record<string, unknown>>(
  options: UseAdminCursorListOptions<TFilters>
): UseAdminCursorListReturn<TItem> {
  const { showFromError } = useApiErrorMessage()
  const onErr = options.onError ?? showFromError

  const initialPageSize = options.initialPageSize ?? 20
  const loading = ref(false)
  const pageSize = ref(initialPageSize)
  const lastListPage = ref(1)
  const pageCursors = ref<Record<number, string | undefined>>({ 1: undefined })

  const pagePayload = shallowRef<AdminCursorPagePayload<TItem>>({
    items: [],
    nextCursor: null,
    hasMore: false,
    chunkSize: initialPageSize,
    totalRecords: 0,
    totalPages: 1,
    currentPage: 1
  })

  const rows = computed(() => pagePayload.value.items)

  const pagerMeta = computed<AdminCursorPagerMeta>(() => ({
    page: pagePayload.value.currentPage ?? 1,
    pageSize: pagePayload.value.chunkSize ?? pageSize.value,
    lastPage: pagePayload.value.totalPages ?? 1,
    total: pagePayload.value.totalRecords ?? 0
  }))

  function resetPagination() {
    pageCursors.value = { 1: undefined }
  }

  /** Gọi API trang `p` chỉ để lấp `pageCursors[p+1]` khi user nhảy số trang (cursor). */
  async function prefetchCursorForPage(p: number) {
    const query = options.buildQuery({
      page: p,
      pageSize: pageSize.value,
      cursors: pageCursors.value,
      filters: options.filters.value
    })
    const raw = await options.fetch(query)
    const pack = parseListPayload<TItem>(raw, options.itemsKey, p, pageSize.value)
    pageSize.value = pack.chunkSize
    const nextIdx = pack.currentPage + 1
    if (pack.nextCursor) {
      pageCursors.value = {
        ...pageCursors.value,
        [nextIdx]: pack.nextCursor
      }
    }
  }

  async function ensureCursorChain(targetPage: number) {
    if (targetPage <= 1) {
      return
    }
    for (let p = 1; p < targetPage; p += 1) {
      const slot = p + 1
      const existing = pageCursors.value[slot]
      if (existing != null && existing !== '') {
        continue
      }
      await prefetchCursorForPage(p)
      const after = pageCursors.value[slot]
      if (after == null || after === '') {
        break
      }
    }
  }

  async function fetchList(page = 1) {
    lastListPage.value = page
    loading.value = true
    try {
      if (page > 1) {
        await ensureCursorChain(page)
      }
      const query = options.buildQuery({
        page,
        pageSize: pageSize.value,
        cursors: pageCursors.value,
        filters: options.filters.value
      })
      const raw = await options.fetch(query)
      const pack = parseListPayload<TItem>(raw, options.itemsKey, page, pageSize.value)

      pagePayload.value = pack
      pageSize.value = pack.chunkSize
      const nextPage = pack.currentPage + 1
      if (pack.nextCursor) {
        pageCursors.value = {
          ...pageCursors.value,
          [nextPage]: pack.nextCursor
        }
      }
    } catch (e) {
      onErr(e)
    } finally {
      loading.value = false
    }
  }

  async function applyFilters() {
    resetPagination()
    await fetchList(1)
  }

  async function onPageSize(s: number) {
    pageSize.value = s
    resetPagination()
    await fetchList(1)
  }

  return {
    loading,
    pagePayload,
    rows,
    pagerMeta,
    pageSize,
    lastListPage,
    pageCursors,
    fetchList,
    applyFilters,
    onPageSize,
    resetPagination
  }
}
