import editorHttp from '~/features/editor/services/editorClient'
import { getEditorPaths } from '~/services/getUrlList.js'

const p = getEditorPaths()

export const authEditorApi = {
  login: body => editorHttp.post(p.login, body),
  logout: () => editorHttp.post(p.logout)
}
