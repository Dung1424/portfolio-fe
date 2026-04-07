/**
 * Redirect to login if not authenticated. Call from client-only flows (clicks, mounted).
 * @returns true if logged in
 */
export async function useRequireLogin() {
  const authStore = useAuthStore()
  await authStore.checkLoginStatus()
  if (!authStore.isLoggedIn) {
    await navigateTo({ name: 'Login' })
    return false
  }
  return true
}
