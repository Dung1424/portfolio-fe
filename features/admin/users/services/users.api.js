import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const usersAdminApi = {
  users: query => adminHttp.get(p.users, { params: query }),
  usersInactive: query => adminHttp.get(p.usersInactive, { params: query }),
  unlockUser: id => adminHttp.patch(p.unlockUser(id)),
  userPhotos: (id, query) => adminHttp.get(p.userPhotos(id), { params: query }),
  userGalleries: (id, query) => adminHttp.get(p.userGalleries(id), { params: query })
}
