/**
 * Protects routes that list this middleware in `definePageMeta`.
 * Admin JWT lives in localStorage as `admin_token` (client-only).
 */
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) {
    return
  }

  const admin = useAdminAuthStore()
  admin.hydrateFromStorage()
  if (!admin.isLoggedIn) {
    return navigateTo({
      path: '/admin/login',
      query: { redirect: to.fullPath }
    })
  }
})
