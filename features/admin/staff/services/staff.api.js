import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const staffAdminApi = {
  staff: query => adminHttp.get(p.staff, { params: query }),
  createStaff: payload => adminHttp.post(p.createStaff, payload),
  updateStaff: (id, payload) => adminHttp.put(p.updateStaff(id), payload),
  resetPassword: (id, password) => adminHttp.patch(p.resetStaffPassword(id), { password }),
  lockStaff: id => adminHttp.patch(p.lockStaff(id)),
  unlockStaff: id => adminHttp.patch(p.unlockStaff(id))
}
