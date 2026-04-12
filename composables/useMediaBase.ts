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

/**
 * Origin for files served by the Laravel app (`/images/photos/…`), not Nuxt.
 * Strips a trailing `/api` segment from `apiBase` (same rule as admin `mediaBase`).
 */
export function usePublicMediaOrigin() {
  const config = useRuntimeConfig()
  return computed(() =>
    String(config.public?.apiBase || '')
      .replace(/\/api(?:\/v\d+)?\/?$/i, '')
      .replace(/\/+$/, '')
  )
}

/** Absolute URL for a backend media path; leaves `http(s)://` unchanged. */
export function resolvePublicMediaUrl(origin: string, path: string | null | undefined): string {
  if (path == null || path === '') {
    return ''
  }
  const s = String(path).trim()
  if (!s) {
    return ''
  }
  if (/^https?:\/\//i.test(s)) {
    return s
  }
  const base = origin.replace(/\/+$/, '')
  const suffix = s.startsWith('/') ? s : `/${s}`
  return `${base}${suffix}`
}

/** Composable: resolve relative `/images/…` paths against the API host (fixes 404 on `/myProfile/…`). */
export function useResolvePublicMediaUrl() {
  const mediaOrigin = usePublicMediaOrigin()
  function resolveMediaUrl(path: string | null | undefined): string {
    return resolvePublicMediaUrl(mediaOrigin.value, path)
  }
  return { mediaOrigin, resolveMediaUrl }
}
