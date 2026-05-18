import editorHttp from '~/features/editor/services/editorClient'
import { getEditorPaths } from '~/services/getUrlList.js'

const p = getEditorPaths()

export const editorSubmissionsApi = {
  submissions: query => editorHttp.get(p.submissions, { params: query }),
  approveSubmission: id => editorHttp.patch(p.approveSubmission(id)),
  rejectSubmission: id => editorHttp.patch(p.rejectSubmission(id)),
  shortlistSubmission: id => editorHttp.patch(p.shortlistSubmission(id))
}
