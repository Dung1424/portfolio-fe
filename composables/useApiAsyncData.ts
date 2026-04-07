import type { AsyncDataOptions } from '#app'

/**
 * useAsyncData — mặc định `server: false` khi handler dùng localStorage / axios client plugin.
 * Gọi API chỉ cần trên server: truyền `{ server: true }` (hoặc bỏ default bằng cách override).
 */
export function useApiAsyncData<T>(
  key: string | (() => string),
  handler: () => Promise<T>,
  options?: AsyncDataOptions<T>
) {
  return useAsyncData<T>(key, handler, {
    server: false,
    ...options
  })
}

export function useApiLazyAsyncData<T>(
  key: string | (() => string),
  handler: () => Promise<T>,
  options?: AsyncDataOptions<T>
) {
  return useLazyAsyncData<T>(key, handler, {
    server: false,
    ...options
  })
}
