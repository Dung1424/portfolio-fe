/**
 * $fetch đã gắn base URL API + Bearer token (client).
 * Dùng dần thay axios cho request mới; axios + plugin vẫn hoạt động song song.
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
