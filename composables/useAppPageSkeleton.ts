/**
 * Trạng thái overlay skeleton toàn trang (optional).
 * Không còn plugin global: muốn dùng, mount `<AppPageSkeleton />` trong layout/page cụ thể và bật/tắt state này.
 */
export function useAppPageSkeleton() {
  return useState('app-page-skeleton-visible', () => false)
}
