const VALID = new Set(['photos', 'galleries', 'likes', 'privacy', 'password'])

/**
 * Chuẩn hóa /account?tab=… — mặc định photos nếu thiếu hoặc không hợp lệ.
 */
export default defineNuxtRouteMiddleware((to) => {
  if (to.path !== '/account') {
    return
  }
  if (import.meta.server) {
    return
  }
  const raw = to.query.tab
  const s = typeof raw === 'string'
    ? raw
    : Array.isArray(raw) && raw[0]
      ? String(raw[0])
      : ''
  if (!s || !VALID.has(s)) {
    return navigateTo({ path: '/account', query: { tab: 'photos' }, replace: true })
  }
})
