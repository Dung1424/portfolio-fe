import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const contactsAdminApi = {
  contacts: query => adminHttp.get(p.contacts, { params: query }),
  replyContact: (id, body) => adminHttp.post(p.replyContact(id), body)
}
