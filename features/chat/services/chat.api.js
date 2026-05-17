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

  /** POST { type: 'group', groupName, participantIds[], groupAvatarObjectKey? } */
  createGroup(body) {
    return axios.post(
      getUrlList().chatConversationCreate,
      {
        type: 'group',
        groupName: body.groupName,
        participantIds: body.participantIds,
        groupAvatarObjectKey: body.groupAvatarObjectKey
      },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  patchGroup(conversationId, body) {
    return axios.patch(
      getUrlList().chatConversationGroupPatch(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  leaveGroup(conversationId) {
    return axios.post(
      getUrlList().chatConversationGroupLeave(conversationId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  dissolveGroup(conversationId) {
    return axios.post(
      getUrlList().chatConversationGroupDissolve(conversationId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  transferGroupAdmin(conversationId, newAdminUserId) {
    return axios.post(
      getUrlList().chatConversationGroupTransferAdmin(conversationId),
      { newAdminUserId: String(newAdminUserId) },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  addGroupMembers(conversationId, userIds) {
    const ids = Array.isArray(userIds) ? userIds.map(x => String(x)) : []
    return axios.post(
      getUrlList().chatConversationGroupAddMembers(conversationId),
      { userIds: ids },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  removeGroupMember(conversationId, userId) {
    return axios.post(
      getUrlList().chatConversationGroupRemoveMember(conversationId),
      { userId: String(userId) },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  startGroupCall(conversationId, callType = 'video') {
    return axios.post(
      getUrlList().chatConversationGroupCallStart(conversationId),
      { callType: callType === 'audio' ? 'audio' : 'video' },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  getActiveGroupCall(conversationId) {
    return axios.get(
      getUrlList().chatConversationGroupCallActive(conversationId),
      authConfig()
    )
  },

  joinGroupCall(conversationId, callId) {
    return axios.post(
      getUrlList().chatConversationGroupCallJoin(conversationId, callId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  leaveGroupCall(conversationId, callId) {
    return axios.post(
      getUrlList().chatConversationGroupCallLeave(conversationId, callId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  endGroupCall(conversationId, callId) {
    return axios.post(
      getUrlList().chatConversationGroupCallEnd(conversationId, callId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  createGroupPoll(conversationId, body) {
    return axios.post(
      getUrlList().chatGroupPolls(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  voteGroupPoll(conversationId, pollId, optionIds) {
    const ids = Array.isArray(optionIds) ? optionIds.map(String) : [String(optionIds)]
    return axios.post(
      getUrlList().chatGroupPollVote(conversationId, pollId),
      { optionIds: ids },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  addGroupPollOption(conversationId, pollId, text) {
    return axios.post(
      getUrlList().chatGroupPollOption(conversationId, pollId),
      { text: String(text || '') },
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  createGroupReminder(conversationId, body) {
    return axios.post(
      getUrlList().chatGroupReminders(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  cancelGroupReminder(conversationId, reminderId) {
    return axios.post(
      getUrlList().chatGroupReminderCancel(conversationId, reminderId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  listGroupNotes(conversationId) {
    return axios.get(getUrlList().chatGroupNotes(conversationId), authConfig())
  },

  createGroupNote(conversationId, body) {
    return axios.post(
      getUrlList().chatGroupNotes(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  updateGroupNote(conversationId, noteId, body) {
    return axios.patch(
      getUrlList().chatGroupNote(conversationId, noteId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  deleteGroupNote(conversationId, noteId) {
    return axios.delete(
      getUrlList().chatGroupNote(conversationId, noteId),
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

  patchConversationNotification(conversationId, body) {
    return axios.patch(
      getUrlList().chatConversationNotification(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  clearConversationHistory(conversationId) {
    return axios.post(
      getUrlList().chatConversationClearHistory(conversationId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  getMessagingEligibility(conversationId) {
    return axios.get(
      getUrlList().chatMessagingEligibility(conversationId),
      authConfig()
    )
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

  /** Query: q, chunkSize (max 50), cursor */
  searchMessagesInConversation(conversationId, params = {}) {
    return axios.get(getUrlList().chatConversationMessagesSearch(conversationId), {
      ...authConfig(),
      params: {
        chunkSize: 20,
        ...params
      }
    })
  },

  /** Query: chunkSize (max 60), cursor */
  listConversationMedia(conversationId, params = {}) {
    return axios.get(getUrlList().chatConversationMessagesMedia(conversationId), {
      ...authConfig(),
      params: {
        chunkSize: 36,
        ...params
      }
    })
  },

  /** Query: chunkSize (max 60), cursor */
  listConversationFiles(conversationId, params = {}) {
    return axios.get(getUrlList().chatConversationMessagesFiles(conversationId), {
      ...authConfig(),
      params: {
        chunkSize: 36,
        ...params
      }
    })
  },

  /** Query: chunkSize (max 60), cursor */
  listConversationLinks(conversationId, params = {}) {
    return axios.get(getUrlList().chatConversationMessagesLinks(conversationId), {
      ...authConfig(),
      params: {
        chunkSize: 36,
        ...params
      }
    })
  },

  /** Query: before, after */
  getMessagesAround(conversationId, messageId, params = {}) {
    return axios.get(getUrlList().chatConversationMessagesAround(conversationId, messageId), {
      ...authConfig(),
      params: {
        before: 20,
        after: 10,
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

  recallMessage(conversationId, messageId) {
    return axios.post(
      getUrlList().chatConversationMessageRecall(conversationId, messageId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  pinMessage(conversationId, messageId) {
    return axios.post(
      getUrlList().chatConversationMessagePin(conversationId, messageId),
      {},
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  unpinMessage(conversationId, messageId) {
    return axios.post(
      getUrlList().chatConversationMessageUnpin(conversationId, messageId),
      {},
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

  /** Body `{ contentType, fileName? }` — presigned PUT to MinIO */
  presignChatImageUpload(conversationId, body) {
    return axios.post(
      getUrlList().chatUploadPresign(conversationId),
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  },

  /** Body `{ contentType, fileName, size }` — presigned PUT to MinIO */
  presignChatFileUpload(conversationId, body) {
    return axios.post(
      getUrlList().chatFileUploadPresign(conversationId),
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
  },

  getPresenceSettings() {
    return axios.get(getUrlList().chatPresenceSettings, authConfig())
  },

  patchPresenceSettings(body) {
    return axios.patch(
      getUrlList().chatPresenceSettings,
      body,
      authConfig({ headers: { 'Content-Type': 'application/json' } })
    )
  }
}
