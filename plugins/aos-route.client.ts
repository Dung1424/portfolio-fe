/**
 * AOS is loaded once from legacy main.js. After Vue Router navigations, new
 * DOM with data-aos is not re-scanned, so content can stay invisible (opacity 0).
 */
export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()

  function refreshAos() {
    if (typeof window === 'undefined') {
      return
    }
    const aos = (window as Window & { AOS?: { refresh?: () => void, refreshHard?: () => void } }).AOS
    if (!aos) {
      return
    }
    if (typeof aos.refreshHard === 'function') {
      aos.refreshHard()
    } else if (typeof aos.refresh === 'function') {
      aos.refresh()
    }
  }

  nuxtApp.hook('page:finish', () => {
    nextTick(() => {
      requestAnimationFrame(refreshAos)
    })
  })

  router.afterEach(() => {
    nextTick(() => {
      requestAnimationFrame(refreshAos)
    })
  })
})
