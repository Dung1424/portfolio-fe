export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) {
    return
  }

  const editor = useEditorAuthStore()
  editor.hydrateFromStorage()
  if (!editor.isLoggedIn) {
    return navigateTo({
      path: '/editor/login',
      query: { redirect: to.fullPath }
    })
  }
})
