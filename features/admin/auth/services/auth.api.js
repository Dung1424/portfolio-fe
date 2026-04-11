import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const authAdminApi = {
  login: body => adminHttp.post(p.login, body),
  logout: () => adminHttp.post(p.logout)
}
