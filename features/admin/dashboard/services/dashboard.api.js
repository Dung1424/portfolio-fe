import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const dashboardAdminApi = {
  dashboard: () => adminHttp.get(p.dashboard),
  photoStatus: () => adminHttp.get(p.statisticsPhotoStatus),
  /** Query: granularity, start_date, end_date (range) | year (month/year). */
  userRegistrations: params =>
    adminHttp.get(p.statisticsUserRegistrations, { params }),
  /** Cùng query/response shape như UserRegistrations; đếm theo upload_date. */
  photoUploads: params =>
    adminHttp.get(p.statisticsPhotoUploads, { params }),
  /** Cùng query/response shape như UserRegistrations / PhotoUploads. */
  reportsStatistics: params =>
    adminHttp.get(p.statisticsReports, { params }),
  /** Top ảnh nhiều like nhất (mặc định top 10 phía server). */
  topPhotosByLikes: () => adminHttp.get(p.statisticsTopPhotosByLikes),
  /** Top ảnh nhiều lượt xem nhất. */
  topPhotosByViews: () => adminHttp.get(p.statisticsTopPhotosByViews)
}
