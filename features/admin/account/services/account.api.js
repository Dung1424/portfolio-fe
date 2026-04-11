import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const accountAdminApi = {
  profile: () => adminHttp.get(p.profile),
  /** Không set Content-Type — axios tự thêm boundary cho FormData. */
  updateProfile: formData => adminHttp.post(p.updateProfile, formData),
  changePassword: body => adminHttp.patch(p.changePassword, body)
}
