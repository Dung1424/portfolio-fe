import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const reportsAdminApi = {
  reportsPhotos: query => adminHttp.get(p.reportsPhotos, { params: query }),
  reportsComments: query => adminHttp.get(p.reportsComments, { params: query }),
  reportsGalleries: query => adminHttp.get(p.reportsGalleries, { params: query }),
  resolveReport: (id, action) => adminHttp.patch(p.resolveReport(id, action))
}
