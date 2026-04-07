/**
 * Origin API (runtimeConfig.public.apiBase).
 * - provide → useNuxtApp().$apiOrigin
 * - globalProperties.apiOrigin (không dùng $) → this.apiOrigin trong Options API, tránh trùng getter $apiOrigin
 */
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const origin = String(config.public.apiBase || '').replace(/\/$/, '')

  nuxtApp.vueApp.config.globalProperties.apiOrigin = origin

  return {
    provide: {
      apiOrigin: origin
    }
  }
})
