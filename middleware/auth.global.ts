/**
 * Bảo vệ route có definePageMeta({ requiresAuth: true }).
 * Token chỉ có trên client (localStorage) — bỏ qua SSR để tránh redirect sai khi hydrate.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.meta.requiresAuth) {
    return
  }
  if (import.meta.server) {
    return
  }

  const auth = useAuthStore()
  await auth.checkLoginStatus()
  if (!auth.isLoggedIn) {
    return navigateTo({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  }
})
