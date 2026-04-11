import type { AdminCursorQueryContext } from '~/composables/useAdminCursorList'

/** Photo admin list filters (approved / pending / rejected) — same fields as `PhotosListPage`. */
export function defaultPhotoAdminListFilters() {
  return {
    title: '',
    location: '',
    category_id: undefined as string | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
    privacy_status: undefined as boolean | undefined
  }
}

export type PhotoAdminListFilters = ReturnType<typeof defaultPhotoAdminListFilters>

function stripEmptyQuery(query: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
}

/** Query GET cursor cho `/Photo/List`, `ListPending`, `ListRejected`. */
export function buildPhotoAdminListCursorQuery(
  filters: PhotoAdminListFilters,
  ctx: Pick<AdminCursorQueryContext<PhotoAdminListFilters>, 'page' | 'pageSize' | 'cursors'>
) {
  const query: Record<string, unknown> = {
    chunkSize: ctx.pageSize,
    cursor: ctx.cursors[ctx.page],
    title: String(filters.title || '').trim() || undefined,
    location: String(filters.location || '').trim() || undefined,
    category_id: filters.category_id || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    privacy_status:
      typeof filters.privacy_status === 'boolean'
        ? (filters.privacy_status ? 1 : 0)
        : undefined
  }
  return stripEmptyQuery(query)
}

export function defaultCategoryAdminListFilters() {
  return {
    title: ''
  }
}

export type CategoryAdminListFilters = ReturnType<typeof defaultCategoryAdminListFilters>

/** Query GET cursor cho `/Category/List`. */
export function buildCategoryAdminListCursorQuery(
  filters: CategoryAdminListFilters,
  ctx: Pick<AdminCursorQueryContext<CategoryAdminListFilters>, 'page' | 'pageSize' | 'cursors'>
) {
  const query: Record<string, unknown> = {
    chunkSize: ctx.pageSize,
    cursor: ctx.cursors[ctx.page],
    title: String(filters.title || '').trim() || undefined
  }
  return stripEmptyQuery(query)
}

/** Admin report lists (`/Report/ListPhotos`, `ListComments`, `ListGalleries`) — same query shape as Swagger. */
export function defaultReportAdminListFilters() {
  return {
    violator_name: '',
    reporter_name: '',
    report_reason: '',
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
    status: undefined as string | undefined,
    action_taken: undefined as string | undefined
  }
}

export type ReportAdminListFilters = ReturnType<typeof defaultReportAdminListFilters>

export function buildReportAdminListCursorQuery(
  filters: ReportAdminListFilters,
  ctx: Pick<AdminCursorQueryContext<ReportAdminListFilters>, 'page' | 'pageSize' | 'cursors'>
) {
  const query: Record<string, unknown> = {
    chunkSize: ctx.pageSize,
    cursor: ctx.cursors[ctx.page],
    violator_name: String(filters.violator_name || '').trim() || undefined,
    reporter_name: String(filters.reporter_name || '').trim() || undefined,
    report_reason: String(filters.report_reason || '').trim() || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    status: filters.status || undefined,
    action_taken: filters.action_taken || undefined
  }
  return stripEmptyQuery(query)
}

/** Admin user lists (`/User/List`, `/User/ListInactive`) — Swagger: chunkSize, cursor, username, email, name, dates, violation_count. */
export function defaultUserAdminListFilters() {
  return {
    username: '',
    email: '',
    name: '',
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
    violation_count: undefined as number | undefined
  }
}

export type UserAdminListFilters = ReturnType<typeof defaultUserAdminListFilters>

export function buildUserAdminListCursorQuery(
  filters: UserAdminListFilters,
  ctx: Pick<AdminCursorQueryContext<UserAdminListFilters>, 'page' | 'pageSize' | 'cursors'>
) {
  const vc = filters.violation_count
  const violationCount = typeof vc === 'number' && Number.isFinite(vc) ? Math.max(0, Math.floor(vc)) : undefined

  const query: Record<string, unknown> = {
    chunkSize: ctx.pageSize,
    cursor: ctx.cursors[ctx.page],
    username: String(filters.username || '').trim() || undefined,
    email: String(filters.email || '').trim() || undefined,
    name: String(filters.name || '').trim() || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined,
    violation_count: violationCount
  }
  return stripEmptyQuery(query)
}

/** Query GET cursor cho `/User/Galleries/{id}` (tham số `title` nếu backend lọc theo tên). */
export function defaultUserGalleriesAdminListFilters() {
  return {
    title: ''
  }
}

export type UserGalleriesAdminListFilters = ReturnType<typeof defaultUserGalleriesAdminListFilters>

export function buildUserGalleriesAdminListCursorQuery(
  filters: UserGalleriesAdminListFilters,
  ctx: Pick<AdminCursorQueryContext<UserGalleriesAdminListFilters>, 'page' | 'pageSize' | 'cursors'>
) {
  const query: Record<string, unknown> = {
    chunkSize: ctx.pageSize,
    cursor: ctx.cursors[ctx.page],
    title: String(filters.title || '').trim() || undefined
  }
  return stripEmptyQuery(query)
}

/** Admin contact list `/Contact/List` — Swagger: chunkSize, cursor, name, email, subject, message, status, dates. */
export function defaultContactAdminListFilters() {
  return {
    name: '',
    email: '',
    subject: '',
    message: '',
    status: undefined as string | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined
  }
}

export type ContactAdminListFilters = ReturnType<typeof defaultContactAdminListFilters>

export function buildContactAdminListCursorQuery(
  filters: ContactAdminListFilters,
  ctx: Pick<AdminCursorQueryContext<ContactAdminListFilters>, 'page' | 'pageSize' | 'cursors'>
) {
  const query: Record<string, unknown> = {
    chunkSize: ctx.pageSize,
    cursor: ctx.cursors[ctx.page],
    name: String(filters.name || '').trim() || undefined,
    email: String(filters.email || '').trim() || undefined,
    subject: String(filters.subject || '').trim() || undefined,
    message: String(filters.message || '').trim() || undefined,
    status: filters.status || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined
  }
  return stripEmptyQuery(query)
}

/** Admin blog list `/Blog/List` — Swagger: chunkSize, cursor, title, slug, author_id, content, dates. */
export function defaultBlogAdminListFilters() {
  return {
    title: '',
    slug: '',
    author_id: '',
    content: '',
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined
  }
}

export type BlogAdminListFilters = ReturnType<typeof defaultBlogAdminListFilters>

export function buildBlogAdminListCursorQuery(
  filters: BlogAdminListFilters,
  ctx: Pick<AdminCursorQueryContext<BlogAdminListFilters>, 'page' | 'pageSize' | 'cursors'>
) {
  const query: Record<string, unknown> = {
    chunkSize: ctx.pageSize,
    cursor: ctx.cursors[ctx.page],
    title: String(filters.title || '').trim() || undefined,
    slug: String(filters.slug || '').trim() || undefined,
    author_id: String(filters.author_id || '').trim() || undefined,
    content: String(filters.content || '').trim() || undefined,
    start_date: filters.start_date || undefined,
    end_date: filters.end_date || undefined
  }
  return stripEmptyQuery(query)
}
