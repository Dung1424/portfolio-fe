/**
 * Skeleton toàn trang khi tải / chuyển route (chỉ client).
 * Không dùng router.isReady().then(hide) — dễ ẩn quá nhanh / đua với hydrate.
 */
export default defineNuxtPlugin(() => {
  const visible = useAppPageSkeleton()
  const router = useRouter()
  /** Tối thiểu từ lần bật overlay (beforeEach) → mới cho tắt (để thấy shimmer) */
  const MIN_VISIBLE_MS = 450
  /** Delay tối thiểu sau khi route xong (afterEach) */
  const AFTER_ROUTE_MS = 220

  let shownAt = 0

  function scheduleHide() {
    nextTick(() => {
      const elapsed = Date.now() - shownAt
      const wait = Math.max(AFTER_ROUTE_MS, MIN_VISIBLE_MS - elapsed)
      setTimeout(() => {
        visible.value = false
      }, wait)
    })
  }

  visible.value = true
  shownAt = Date.now()

  router.beforeEach(() => {
    visible.value = true
    shownAt = Date.now()
  })

  router.afterEach(() => {
    scheduleHide()
  })
})
