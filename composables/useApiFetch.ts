/**
 * $fetch kèm base URL API + Bearer (client). Dùng tùy chọn; services/stores chính dùng axios + plugin.
 */
export function useApiFetch() {
  const config = useRuntimeConfig()
  const base = String(config.public.apiBase || '').replace(/\/$/, '')
  const apiPrefix = `${base}/api`

  return $fetch.create({
    baseURL: apiPrefix,
    onRequest({ options }) {
      if (!import.meta.client) {
        return
      }
      const token = localStorage.getItem('token')
      const headers = new Headers(options.headers as HeadersInit)
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      options.headers = headers
    }
  })
}
