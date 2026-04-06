export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }
  const authStore = useAuthStore()
  await authStore.checkLoginStatus()
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return navigateTo({ path: '/login', query: { redirect: to.fullPath } })
  }
})
