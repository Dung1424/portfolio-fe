/** Trạng thái overlay skeleton toàn trang (điều khiển bởi plugin `app-page-skeleton.client`). */
export function useAppPageSkeleton() {
  return useState('app-page-skeleton-visible', () => false)
}
