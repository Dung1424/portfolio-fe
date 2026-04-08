/**
 * Hiệu ứng placeholder kiểu 500px: khung xám + **shimmer** (class `.skeleton-shimmer` trong `assets/css/main.css`).
 *
 * **Phân biệt hai kiểu “đang tải”:**
 *
 * 1. **Lần đầu / chưa có dữ liệu** — dùng lưới khung + shimmer (`FeedSkeletonGrid`, `SkeletonBox`, hoặc overlay `AppPageSkeleton` khi chuyển route). Có thể đặt **chỉ một section** (không bắt buộc cả trang).
 *
 * 2. **Tải thêm** (pagination, infinite scroll) — dùng **spinner / indicator nhỏ** (`FeedLoadMoreIndicator`), **không** dùng full grid shimmer để tránh nhầm với “đang load trang”.
 *
 * Ảnh đã hiển thị nhưng file chưa decode: overlay shimmer trên từng ô (ví dụ `ForYou.vue` + `@load` ảnh).
 *
 * Tab **Following** / **Explore**: `FollowingTabSkeleton` / `ExploreTabSkeleton` khi `pageReady === false` (lần đầu vào tab), không dùng cho infinite scroll.
 */

export function isInitialSkeletonState(loading: boolean, itemCount: number) {
  return Boolean(loading && itemCount === 0)
}

/** Đang fetch trang tiếp theo khi đã có ít nhất một item — dùng spinner, không dùng skeleton grid đầy. */
export function isPaginationLoading(loading: boolean, itemCount: number) {
  return Boolean(loading && itemCount > 0)
}

/** Thời gian tối thiểu skeleton nhìn thấy (ms) — tránh API quá nhanh khiến không kịp thấy shimmer */
export const MIN_SKELETON_VISIBLE_MS = 850

/**
 * Chờ thêm cho đủ `MIN_SKELETON_VISIBLE_MS` kể từ `startedAt` (Date.now() khi bắt đầu load).
 */
export function waitRemainingSkeletonMs(
  startedAt: number,
  minMs: number = MIN_SKELETON_VISIBLE_MS,
): Promise<void> {
  const elapsed = Date.now() - startedAt
  const wait = Math.max(0, minMs - elapsed)
  return new Promise(resolve => setTimeout(resolve, wait))
}
