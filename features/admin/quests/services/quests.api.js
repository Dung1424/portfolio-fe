import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

export const questsAdminApi = {
  quests: query => adminHttp.get(p.quests, { params: query }),
  quest: id => adminHttp.get(p.quest(id)),
  createQuest: payload => adminHttp.post(p.createQuest, payload),
  updateQuest: (id, payload) => adminHttp.put(p.updateQuest(id), payload),
  updateQuestStatus: (id, status) => adminHttp.patch(p.updateQuestStatus(id), { status }),
  finalizeQuest: id => adminHttp.post(p.finalizeQuest(id)),
  submissions: query => adminHttp.get(p.submissions, { params: query }),
  approveSubmission: id => adminHttp.patch(p.approveSubmission(id)),
  rejectSubmission: id => adminHttp.patch(p.rejectSubmission(id)),
  shortlistSubmission: id => adminHttp.patch(p.shortlistSubmission(id))
}
