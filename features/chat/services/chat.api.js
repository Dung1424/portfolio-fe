import axios from 'axios'
import getUrlList from '~/services/getUrlList.js'

function authConfig(extra = {}) {
  const headers = { ...(extra.headers || {}) }
  if (import.meta.client) {
    const token = localStorage.getItem('token')
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }
  }
  return { ...extra, headers }
}

/** Payload `data` trong envelope `{ success, data }` */
export function unwrapChatData(response) {
  const d = response?.data
  if (d && typeof d === 'object' && 'data' in d && d.data !== undefined) {
    return d.data
  }
  return d
}

export const chatApi = {
  /** POST body `{ otherUserId: string }` */
  ensure(otherUserId) {
    return axios.post(
      getUrlList().chatConversationEnsure,
      { otherUserId: String(otherUserId) },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  /** Query: page, limit, folder (inbox | pending | all) */
  listConversations(params = {}) {
    return axios.get(getUrlList().chatConversations, {
      ...authConfig(),
      params: {
        page: 1,
        limit: 20,
        folder: 'inbox',
        ...params
      }
    })
  },

  folderUnreadSummary() {
    return axios.get(getUrlList().chatConversationsUnreadSummary, authConfig())
  },

  getConversation(conversationId) {
    return axios.get(getUrlList().chatConversation(conversationId), authConfig())
  },

  /** Query: chunkSize (default 20, max 100), cursor (older messages) */
  getMessages(conversationId, params = {}) {
    return axios.get(getUrlList().chatConversationMessages(conversationId), {
      ...authConfig(),
      params: {
        chunkSize: 20,
        ...params
      }
    })
  },

  /** Body: { text?, type?, attachments?, metadata? } */
  postMessage(conversationId, body) {
    return axios.post(
      getUrlList().chatConversationMessages(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  postRead(conversationId, body) {
    return axios.post(
      getUrlList().chatConversationRead(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  /** Body `{ userIds: string[] }` — tối đa 50 */
  presenceQuery(userIds) {
    const ids = Array.isArray(userIds) ? userIds.map(x => String(x)) : []
    return axios.post(
      getUrlList().chatPresenceQuery,
      { userIds: ids },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  }
}
