import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const galleriesAdminApi = {
  galleryPhotos: (id, query) => adminHttp.get(p.galleryPhotos(id), { params: query })
}
