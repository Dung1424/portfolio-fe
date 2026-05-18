import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const storeAdminApi = {
  items: query => adminHttp.get(p.storeItems, { params: query }),
  createItem: payload => adminHttp.post(p.createStoreItem, payload),
  updateItem: (id, payload) => adminHttp.put(p.updateStoreItem(id), payload),
  redemptions: query => adminHttp.get(p.redemptions, { params: query }),
  updateRedemptionStatus: (id, status) => adminHttp.patch(p.updateRedemptionStatus(id), { status })
}
