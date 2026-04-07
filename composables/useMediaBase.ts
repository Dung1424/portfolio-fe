/** API base URL with trailing slash, for building media URLs (avatars, etc.). */
export function useMediaBase() {
  const config = useRuntimeConfig()
  return computed(() => {
    const base = config.public.apiBase || ''
    return base.endsWith('/') ? base : `${base}/`
  })
}

/** Join API base with a path from the backend (often starts with `/`) — avoids `//` in the URL. */
export function joinMediaUrl(base: string, path: string): string {
  const b = base.replace(/\/+$/, '')
  const p = path.replace(/^\/+/, '')
  if (!p) return b
  return `${b}/${p}`
}
