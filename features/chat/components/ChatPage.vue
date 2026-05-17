<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { Modal, notification } from 'ant-design-vue'
import { useChatMessageNotify } from '~/features/chat/composables/useChatMessageNotify.js'
import { useChatConversationList } from '~/features/chat/composables/useChatConversationList.js'
import { useChatCall } from '~/features/chat/composables/useChatCall.js'
import { useLiveKitGroupCall } from '~/features/chat/composables/useLiveKitGroupCall.js'
import { useChatMessaging } from '~/features/chat/composables/useChatMessaging.js'
import { useConversationTyping } from '~/features/chat/composables/useConversationTyping.ts'
import { useResolvePublicMediaUrl } from '~/composables/useMediaBase'
import { profileService } from '~/features/profile/services/profile.api.js'
import { useUserStore } from '~/stores/userStore.js'
import { useFollowStore } from '~/stores/followStore.js'
import { outgoingMessageReceiptLabel } from '~/features/chat/utils/chatReceipts.js'
import { lastOwnUiMessageId } from '~/features/chat/utils/chatMappers.js'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import ChatThreadSearchPanel from '~/features/chat/components/ChatThreadSearchPanel.vue'
import ChatConversationSidebar from '~/features/chat/components/ChatConversationSidebar.vue'
import ChatPinnedMessagesSection from '~/features/chat/components/ChatPinnedMessagesSection.vue'
import ChatMessageList from '~/features/chat/components/ChatMessageList.vue'
import ChatComposer from '~/features/chat/components/ChatComposer.vue'
import ChatGroupDetailsDrawer from '~/features/chat/components/ChatGroupDetailsDrawer.vue'
import ChatDirectDetailsDrawer from '~/features/chat/components/ChatDirectDetailsDrawer.vue'
import ChatStorageDrawer from '~/features/chat/components/ChatStorageDrawer.vue'
import ChatGroupCallStage from '~/features/chat/components/ChatGroupCallStage.vue'
import { useChatThreadSearch } from '~/features/chat/composables/useChatThreadSearch.js'
import { useChatStickerPicker } from '~/features/chat/composables/useChatStickerPicker.js'
import {
  isCallLogMessage,
  callLogIcon,
  callLogTitle,
  callLogCardTitle,
  callLogTone,
  callLogDuration,
} from '~/features/chat/utils/chatCallLog.js'
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
  emitRoomJoin,
  startPresenceHeartbeat,
  stopPresenceHeartbeat,
} from '~/features/chat/services/chatSocket.js'

const userStore = useUserStore()
const followStore = useFollowStore()
const { resolveMediaUrl } = useResolvePublicMediaUrl()
const incomingProfileCache = new Map()
/** userId → { name, username, avatarUrl } — cache hồ sơ tối thiểu cho chat nhóm */
const chatUserMiniCache = new Map()

/** Fallback when `peerAvatarUrl` is missing (served from `public/images/`). */
const defaultAvatarUrl = '/images/userDefault.png'

const selectedId = ref(null)
const mobileShowThread = ref(false)

const conversationList = useChatConversationList(selectedId, mobileShowThread)
const {
  conversations,
  listFolder,
  inboxUnreadTotal,
  pendingUnreadTotal,
  listLoading,
  loadConversationList,
  setListFolder: setListFolderInner,
  onPresenceUpdate,
  applyPresenceToConversations,
  scheduleRefreshFolderUnreadTotals,
  clearFolderUnreadDebounce,
  mergeConversationFromRealtime,
} = conversationList

const myUserId = computed(() => userStore.user?.id ?? null)

const groupDetailsOpen = ref(false)
const directDetailsOpen = ref(false)
const storageDrawerOpen = ref(false)
const storageDrawerTab = ref('media')
const accountSettingsOpen = ref(false)
const mediaPanelLoading = ref(false)
const mediaPanelLoaded = ref(false)
const mediaPanelItems = ref([])
const mediaPanelNextCursor = ref(null)
const mediaPanelHasMore = ref(false)
const filePanelLoading = ref(false)
const filePanelLoaded = ref(false)
const filePanelItems = ref([])
const filePanelNextCursor = ref(null)
const filePanelHasMore = ref(false)
const linkPanelLoading = ref(false)
const linkPanelLoaded = ref(false)
const linkPanelItems = ref([])
const linkPanelNextCursor = ref(null)
const linkPanelHasMore = ref(false)
const activeStatusVisible = ref(true)
const activeStatusLoading = ref(false)
const notificationSoundEnabled = ref(true)
const messagePreviewEnabled = ref(true)
const readReceiptsEnabled = ref(true)
const typingStatusVisible = ref(true)
const messageRequestsFrom = ref('everyone')
const accountSettingSavingKey = ref('')
const groupDetailMemberRows = ref([])
const addMemberCandidates = ref([])
const groupMembersHydrateLoading = ref(false)
const addMembersListLoading = ref(false)
const addMembersSubmitLoading = ref(false)
const groupDrawerContentLoading = computed(() =>
  groupMembersHydrateLoading.value || addMembersListLoading.value,
)

/** Nhóm: userId → { name, avatarUrl, username } — hiển thị người gửi trong thread */
const groupSenderDisplayByUserId = ref({})

const notify = useChatMessageNotify(selectedId, mobileShowThread, {
  notificationSoundEnabled,
})
const {
  notifyAudioRef,
  notifySoundSrc,
  unlockNotifyAudio,
  mountNotifyUnlock,
  unmountNotifyUnlock,
  maybePlayIncomingNotify,
} = notify

const messaging = useChatMessaging(
  conversations,
  selectedId,
  mobileShowThread,
  myUserId,
  scheduleRefreshFolderUnreadTotals,
  maybePlayIncomingNotify,
  { onMessagePersisted: syncMediaItemFromRaw },
)

const {
  messagesLoading,
  loadingOlderMessages,
  sendPending,
  draft,
  replyTo,
  pendingChatImage,
  pendingChatFile,
  messagesScrollEl,
  highlightedMessageId,
  active,
  clearReadDebounceTimer,
  markConversationReadUpTo,
  scheduleMarkReadForOpenConversation,
  scrollMessagesToBottom,
  onMessagesScroll,
  loadMessagesForConversation,
  onMessageNew,
  onMessageUpdated,
  onConversationPinsUpdated,
  refreshPinnedMessages,
  onConversationRead,
  clearPendingChatImage,
  clearPendingChatFile,
  startReplyToMessage: startReplyToMessageInner,
  clearReplyToMessage,
  jumpToMessage,
  onChatImageSelected,
  onChatFileSelected,
  send: postChatMessage,
  sendSticker: postChatSticker,
} = messaging

const selectedConversationId = computed(() => {
  return selectedId.value != null ? String(selectedId.value) : null
})
const { peerTyping, setTyping } = useConversationTyping(selectedConversationId, myUserId)
let localTyping = false
let typingStopTimer = null
const TYPING_STOP_DELAY_MS = 1500

const call = useChatCall(selectedId, active, myUserId)
const {
  CALL_TYPE,
  callState,
  callDurationSeconds,
  connectionState,
  currentCall,
  incomingCall,
  isCalling,
  isInCall,
  isMuted,
  isCameraOn,
  incomingRingRemainingSeconds,
  localVideoRef,
  remoteVideoRef,
  remoteAudioRef,
  startOutgoingCall,
  acceptIncomingCall,
  rejectIncomingCall,
  hangupActiveCall,
  toggleMute,
  toggleCamera,
} = call

const groupCall = useLiveKitGroupCall(active, myUserId, getChatUserDisplay)
const {
  groupCallSession,
  incomingGroupCall,
  groupCallState,
  groupCallTiles,
  groupCallDurationSeconds,
  groupCallMicEnabled,
  groupCallCameraEnabled,
  isGroupCalling,
  showIncomingGroupCall,
  startGroupCall,
  joinGroupCall,
  leaveGroupCall,
  dismissIncomingGroupCall,
  toggleGroupCallMic,
  toggleGroupCallCamera,
} = groupCall
const showJumpToLatest = ref(false)
const JUMP_TO_LATEST_THRESHOLD_PX = 180

/** { allowed, reason, scope } — GET Node → Laravel (direct 1-1) */
const messagingEligibility = ref({
  allowed: true,
  reason: null,
  scope: 'not_direct',
})

const messagingAllowed = computed(() => {
  if (messagingEligibility.value.allowed === false) {
    return false
  }
  const a = active.value
  if (a?.type === 'group' && a?.canSendMessages === false) {
    return false
  }
  return true
})

const messagingGateBannerText = computed(() => {
  const a = active.value
  if (a?.isGroup && a.viewerRemovedByAdmin && a.viewerHasLeft) {
    return 'Admin đã xóa bạn khỏi nhóm. Bạn chỉ xem được tin nhắn tới thời điểm đó; tin mới hơn sẽ không hiển thị. Khi được mời lại, bạn xem lại toàn bộ lịch sử như bình thường.'
  }
  if (messagingEligibility.value.allowed !== false) {
    return ''
  }
  const r = messagingEligibility.value.reason
  const map = {
    blocked: 'Bạn đã chặn người này — không thể gửi tin hoặc gọi trong cuộc trò chuyện này.',
    blocked_by_peer: 'Bạn không thể nhắn tin hoặc gọi người dùng này.',
    account_locked_peer: 'Tài khoản đối phương không khả dụng.',
    account_locked_sender: 'Tài khoản của bạn không thể gửi tin nhắn.',
    peer_not_found: 'Không tìm thấy người dùng.',
    sender_not_found: 'Không xác định được tài khoản của bạn.',
    invalid_request: 'Không thể nhắn tin trong cuộc trò chuyện này.',
    eligibility_unavailable:
      'Không gọi được Laravel từ máy chat (URL nội bộ hoặc Laravel chưa chạy). Nếu dùng Docker: cần LARAVEL_API_BASE_URL=http://portfolio_nginx và restart container portfolio_chat. Bạn vẫn có thể thử gửi tin.',
    internal_key_mismatch:
      'Khóa nội bộ CHAT_INTERNAL_SERVICE_KEY không khớp giữa Node và Laravel — kiểm tra hai file .env.',
    laravel_internal_not_configured:
      'Laravel chưa bật CHAT_INTERNAL_SERVICE_KEY (hoặc trả lỗi 503 cho API nội bộ).',
    recipient_requires_mutual_follow:
      'Người này chỉ nhận tin nhắn từ người follow lẫn nhau.',
    recipient_requires_following:
      'Người này chỉ nhận tin nhắn từ người họ đang follow.',
    left_group: 'Bạn đã rời nhóm — chỉ xem được lịch sử, không gửi tin hoặc gọi.',
    group_dissolved: 'Nhóm đã được giải tán.',
  }
  return map[r] || 'Không thể nhắn tin trong cuộc trò chuyện này.'
})

async function fetchMessagingEligibility(conversationId) {
  const cid = conversationId != null ? String(conversationId).trim() : ''
  if (!cid) {
    messagingEligibility.value = {
      allowed: true,
      reason: null,
      scope: 'not_direct',
    }
    return
  }
  try {
    const res = await chatApi.getMessagingEligibility(cid)
    const d = unwrapChatData(res)
    messagingEligibility.value = {
      allowed: d?.allowed !== false,
      reason: typeof d?.reason === 'string' ? d.reason : null,
      scope: typeof d?.scope === 'string' ? d.scope : 'unknown',
    }
  } catch {
    messagingEligibility.value = {
      allowed: true,
      reason: null,
      scope: 'unknown',
    }
  }
}

const callDurationLabel = computed(() => {
  const total = Math.max(0, Number(callDurationSeconds.value) || 0)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const groupCallDurationLabel = computed(() => {
  const total = Math.max(0, Number(groupCallDurationSeconds.value) || 0)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})

const showIncomingCallModal = computed(() => callState.value === 'incoming_ringing' && Boolean(incomingCall.value))
const showCallStage = computed(() => isCalling.value && callState.value !== 'incoming_ringing')
const incomingRingCountdownLabel = computed(() => {
  const total = Math.max(0, Number(incomingRingRemainingSeconds.value) || 0)
  const min = Math.floor(total / 60)
  const sec = total % 60
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
})
const incomingCallerProfile = ref(null)
const incomingConversation = computed(() => {
  const incoming = incomingCall.value
  if (!incoming) {
    return null
  }
  const byConversationId = conversations.value.find(
    c => String(c.id) === String(incoming.conversationId || ''),
  )
  if (byConversationId) {
    return byConversationId
  }
  const peerId = String(incoming.peerUserId || '')
  if (!peerId) {
    return null
  }
  return conversations.value.find(c => String(c.peerUserId || '') === peerId) || null
})
const incomingGroupConversation = computed(() => {
  const cid = incomingGroupCall.value?.conversationId
  if (!cid) {
    return null
  }
  return conversations.value.find(c => String(c.id) === String(cid)) || null
})

async function fetchIncomingCallerProfile(peerUserId) {
  const pid = String(peerUserId || '').trim()
  if (!pid) {
    incomingCallerProfile.value = null
    return
  }
  if (incomingProfileCache.has(pid)) {
    incomingCallerProfile.value = incomingProfileCache.get(pid)
    return
  }
  try {
    const token = import.meta.client ? localStorage.getItem('token') : null
    const res = await profileService.fetchByUserId(pid, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const raw = res?.data?.data ?? res?.data
    const user = raw?.user ?? raw
    const profile = user?.id
      ? {
          userId: String(user.id),
          name: (user.name && String(user.name).trim()) || user.username || `User ${pid}`,
          username: user.username ? String(user.username) : '',
          avatarUrl: user.profile_picture ? resolveMediaUrl(user.profile_picture) : '',
        }
      : null
    if (profile) {
      incomingProfileCache.set(pid, profile)
    }
    incomingCallerProfile.value = profile
  } catch (e) {
    console.error('fetchIncomingCallerProfile', e)
    incomingCallerProfile.value = null
  }
}

const callDisplayName = computed(() => {
  if (showIncomingCallModal.value) {
    const peerId = String(incomingCall.value?.peerUserId || '').trim()
    return incomingCallerProfile.value?.name
      || incomingConversation.value?.name
      || (peerId ? `User ${peerId}` : 'Unknown caller')
  }
  if (currentCall.value?.peerUserId && incomingCallerProfile.value?.userId === String(currentCall.value.peerUserId)) {
    return incomingCallerProfile.value.name
  }
  return active.value?.name || incomingConversation.value?.name || 'Contact'
})
const callDisplayAvatar = computed(() => {
  if (showIncomingCallModal.value) {
    return incomingCallerProfile.value?.avatarUrl || incomingConversation.value?.peerAvatarUrl || defaultAvatarUrl
  }
  if (currentCall.value?.peerUserId && incomingCallerProfile.value?.userId === String(currentCall.value.peerUserId)) {
    return incomingCallerProfile.value.avatarUrl || defaultAvatarUrl
  }
  return active.value?.peerAvatarUrl || incomingConversation.value?.peerAvatarUrl || defaultAvatarUrl
})

function isSystemMessage(msg) {
  return (
    msg?.type === 'system'
    || isCallLogMessage(msg)
    || msg?.metadata?.kind === 'group_event'
  )
}

/** Trong nhóm, tách cụm bubble theo từng người gửi (không gộp hết phía "đối phương"). */
function messagesInSameRun(prev, msg, isGroupConv) {
  if (!prev) {
    return false
  }
  if (isSystemMessage(prev) || isSystemMessage(msg)) {
    return false
  }
  if (Boolean(prev.me) !== Boolean(msg.me)) {
    return false
  }
  if (msg.me) {
    return true
  }
  if (!isGroupConv) {
    return true
  }
  const a = prev.senderUserId != null ? String(prev.senderUserId) : ''
  const b = msg.senderUserId != null ? String(msg.senderUserId) : ''
  return a !== '' && a === b
}

async function setListFolder(folder) {
  clearReadDebounceTimer()
  await setListFolderInner(folder)
}

function sendMessage() {
  if (!messagingAllowed.value) {
    return
  }
  stopTypingNow()
  postChatMessage(unlockNotifyAudio)
}

function updateJumpToLatestVisibility() {
  const el = messagesScrollEl.value
  if (!el || !active.value?.messages?.length) {
    showJumpToLatest.value = false
    return
  }
  const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight
  showJumpToLatest.value = distanceToBottom > JUMP_TO_LATEST_THRESHOLD_PX
}

function onMessagesScrollWithJump(e) {
  onMessagesScroll(e)
  updateJumpToLatestVisibility()
}

function jumpToLatestMessage() {
  scrollMessagesToBottom()
  showJumpToLatest.value = false
  if (active.value?.id) {
    scheduleMarkReadForOpenConversation(String(active.value.id))
  }
}

function clearTypingStopTimer() {
  if (typingStopTimer) {
    clearTimeout(typingStopTimer)
    typingStopTimer = null
  }
}

function stopTypingNow() {
  clearTypingStopTimer()
  if (localTyping) {
    localTyping = false
    setTyping(false)
  }
}

function scheduleTypingStop() {
  clearTypingStopTimer()
  typingStopTimer = setTimeout(() => {
    stopTypingNow()
  }, TYPING_STOP_DELAY_MS)
}

function onComposerInput() {
  if (!typingStatusVisible.value) {
    stopTypingNow()
    return
  }
  const hasText = draft.value.trim().length > 0
  if (!hasText) {
    stopTypingNow()
    return
  }
  if (!localTyping) {
    localTyping = true
    setTyping(true)
  }
  scheduleTypingStop()
}

const stickerPicker = useChatStickerPicker({
  messagingAllowed,
  stopTypingNow,
  postChatSticker,
  unlockNotifyAudio,
})
const {
  stickerPickerOpen,
  stickerPackActive,
  stickerRows,
  loadStickerPack,
  toggleStickerPicker,
  selectStickerPack,
  onStickerImageError,
  sendStickerMessage,
} = stickerPicker

const query = ref('')
const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) {
    return conversations.value
  }
  return conversations.value.filter(
    c =>
      c.name.toLowerCase().includes(q)
      || c.username.toLowerCase().includes(q)
      || c.lastMessage.toLowerCase().includes(q),
  )
})

const {
  threadSearchOpen,
  threadSearchDraft,
  threadSearchLoading,
  threadSearchResults,
  threadSearchHasMore,
  toggleThreadSearch,
  loadMoreThreadSearch,
  onThreadSearchResultClick,
  clearThreadSearchDebounce,
} = useChatThreadSearch(active, selectedId, jumpToMessage)

const activeMessageRows = computed(() => {
  const list = active.value?.messages
  const isGroupConv = Boolean(active.value?.isGroup)
  if (!list?.length) {
    return []
  }
  return list.map((msg, i) => {
    const prev = list[i - 1]
    const next = list[i + 1]
    const sameRunPrev = prev && messagesInSameRun(prev, msg, isGroupConv)
    const sameRunNext = next && messagesInSameRun(msg, next, isGroupConv)
    return {
      msg,
      index: i,
      showMeta: !sameRunNext,
      groupFirst: !sameRunPrev,
      groupLast: !sameRunNext,
    }
  })
})

const receiptDetailForMessageId = ref(null)
const brokenAvatarIds = ref(new Set())

const messageActionMenuId = ref(null)
const messageActionHoverId = ref(null)
let messageActionHideTimer = null

function timeLabel(d) {
  const t = typeof d === 'string' ? new Date(d) : d
  const diff = Date.now() - t.getTime()
  if (diff < 86_400_000) {
    return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 7 * 86_400_000) {
    return t.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function markAvatarBroken(id) {
  const next = new Set(brokenAvatarIds.value)
  next.add(id)
  brokenAvatarIds.value = next
}

function isAvatarBroken(id) {
  return brokenAvatarIds.value.has(id)
}

function incomingAvatarSrc() {
  const key = incomingCall.value?.conversationId || incomingCall.value?.peerUserId || 'incoming'
  if (isAvatarBroken(key)) {
    return defaultAvatarUrl
  }
  return callDisplayAvatar.value
}

function usableProfileUsername(username) {
  const u = String(username || '').trim()
  if (!u || u.toLowerCase() === 'user') {
    return ''
  }
  return u
}

async function resolvePeerProfileUsername(conv) {
  if (!conv?.peerUserId) {
    return ''
  }
  const hinted = usableProfileUsername(conv.username)
  if (hinted) {
    return hinted
  }
  try {
    const token = import.meta.client ? localStorage.getItem('token') : null
    const res = await profileService.fetchByUserId(String(conv.peerUserId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const raw = res?.data?.data ?? res?.data
    const user = raw?.user ?? raw
    const username = usableProfileUsername(user?.username)
    if (!username) {
      return ''
    }
    conv.username = username
    const name = String(user?.name || '').trim()
    if (name) {
      conv.name = name
    }
    const pic = user?.profile_picture
    if (pic) {
      conv.peerAvatarUrl = resolveMediaUrl(pic)
    }
    return username
  } catch (e) {
    console.error('resolvePeerProfileUsername', e)
    return ''
  }
}

async function openPeerProfile(conv) {
  const username = await resolvePeerProfileUsername(conv)
  if (!username) {
    notification.warning({ message: 'Không mở được profile người dùng.' })
    return
  }
  await navigateTo({ name: 'MyProfile', params: { username } })
}

async function getChatUserDisplay(userId) {
  const id = userId != null ? String(userId) : ''
  if (!id) {
    return { name: 'User', username: '', avatarUrl: '' }
  }
  if (chatUserMiniCache.has(id)) {
    return chatUserMiniCache.get(id)
  }
  try {
    const token = import.meta.client ? localStorage.getItem('token') : null
    const res = await profileService.fetchByUserId(id, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const raw = res?.data?.data ?? res?.data
    const user = raw?.user ?? raw
    const name = (user?.name && String(user.name).trim()) || user?.username || 'User'
    const username = user?.username ? String(user.username) : ''
    const pic = user?.profile_picture
    const row = {
      name: String(name),
      username,
      avatarUrl: pic ? resolveMediaUrl(pic) : '',
    }
    chatUserMiniCache.set(id, row)
    return row
  }
  catch (e) {
    console.warn('getChatUserDisplay', id, e)
    const row = { name: 'User', username: '', avatarUrl: '' }
    chatUserMiniCache.set(id, row)
    return row
  }
}

async function onChatHeaderIdentityClick() {
  const c = active.value
  if (!c) {
    return
  }
  if (c.isGroup) {
    unlockNotifyAudio()
    groupDetailsOpen.value = true
  }
  else {
    unlockNotifyAudio()
    directDetailsOpen.value = true
  }
}

async function openUserProfileById(userId) {
  const id = userId != null ? String(userId) : ''
  if (!id) {
    return
  }
  if (myUserId.value != null && String(myUserId.value) === id) {
    const u = userStore.user?.username
    if (u) {
      await navigateTo({ name: 'MyProfile', params: { username: String(u) } })
      return
    }
  }
  await openPeerProfile({ peerUserId: id, username: '', name: 'User' })
}

async function ensureGroupSenderDisplay(userId) {
  const id = userId != null ? String(userId) : ''
  if (!id) {
    return
  }
  if (groupSenderDisplayByUserId.value[id]) {
    return
  }
  if (chatUserMiniCache.has(id)) {
    const mini = chatUserMiniCache.get(id)
    groupSenderDisplayByUserId.value = {
      ...groupSenderDisplayByUserId.value,
      [id]: {
        name: mini.name,
        avatarUrl: mini.avatarUrl,
        username: mini.username,
      },
    }
    return
  }
  const mini = await getChatUserDisplay(id)
  groupSenderDisplayByUserId.value = {
    ...groupSenderDisplayByUserId.value,
    [id]: {
      name: mini.name,
      avatarUrl: mini.avatarUrl,
      username: mini.username,
    },
  }
}

function toggleOutgoingReceiptDetail(messageId) {
  if (messageId == null) {
    return
  }
  const id = String(messageId)
  receiptDetailForMessageId.value = receiptDetailForMessageId.value === id ? null : id
}

function toggleMessageActionMenu(messageId) {
  const id = messageId != null ? String(messageId) : ''
  if (!id) return
  if (messageActionHideTimer) {
    clearTimeout(messageActionHideTimer)
    messageActionHideTimer = null
  }
  messageActionHoverId.value = id
  messageActionMenuId.value = messageActionMenuId.value === id ? null : id
}

function closeMessageActionMenu() {
  messageActionMenuId.value = null
}

function isMessageActionMenuOpen(messageId) {
  return messageActionMenuId.value === String(messageId)
}

function clearMessageActionHideTimer() {
  if (messageActionHideTimer) {
    clearTimeout(messageActionHideTimer)
    messageActionHideTimer = null
  }
}

function onMessageActionHoverEnter(messageId) {
  clearMessageActionHideTimer()
  messageActionHoverId.value = String(messageId)
}

function onMessageActionHoverLeave(messageId) {
  const id = String(messageId)
  clearMessageActionHideTimer()
  messageActionHideTimer = setTimeout(() => {
    if (messageActionHoverId.value === id) {
      messageActionHoverId.value = null
    }
    messageActionHideTimer = null
  }, 180)
}

function shouldShowMessageActions(msg) {
  if (!msg || msg.recalledAt) {
    return false
  }
  const id = String(msg.id ?? '')
  return Boolean(id) && (messageActionHoverId.value === id || isMessageActionMenuOpen(id))
}

async function copyMessageToClipboard(msg) {
  closeMessageActionMenu()
  try {
    const text = typeof msg?.text === 'string' ? msg.text : ''
    const copy = text || (typeof msg?.imageUrl === 'string' ? msg.imageUrl : '')
    if (!copy) {
      return
    }
    await navigator.clipboard.writeText(copy)
    notification.success({ message: 'Copied' })
  } catch (e) {
    console.error('copyMessage', e)
    notification.error({ message: 'Could not copy.' })
  }
}

function startReplyToMessage(msg) {
  closeMessageActionMenu()
  startReplyToMessageInner(msg)
}

async function recallMessageForEveryone(msg) {
  closeMessageActionMenu()
  const cid = active.value?.id
  const mid = msg?.id
  if (!cid || !mid) {
    return
  }
  try {
    await chatApi.recallMessage(cid, mid)
  } catch (e) {
    console.error('recallMessage', e)
    notification.error({
      message: 'Recall',
      description: e?.response?.data?.message || 'Could not recall message.'
    })
  }
}

function isPinnedMessageId(messageId) {
  const id = String(messageId ?? '')
  const pins = active.value?.pinnedMessages
  if (!Array.isArray(pins) || !id) {
    return false
  }
  return pins.some(p => String(p.messageId) === id)
}

function canPinAnotherMessage() {
  return (active.value?.pinnedMessages?.length ?? 0) < 3
}

async function pinMessageRow(msg) {
  closeMessageActionMenu()
  const cid = active.value?.id
  const mid = msg?.id
  if (!cid || !mid) {
    return
  }
  if (isPinnedMessageId(mid)) {
    return
  }
  if (!canPinAnotherMessage()) {
    notification.warning({
      message: 'Pin',
      description: 'You can pin up to 3 messages.',
    })
    return
  }
  try {
    const res = await chatApi.pinMessage(cid, mid)
    const data = unwrapChatData(res)
    if (active.value && Array.isArray(data?.pinnedMessages)) {
      active.value.pinnedMessages = data.pinnedMessages
    }
    notification.success({ message: 'Message pinned.' })
  }
  catch (e) {
    console.error('pinMessage', e)
    notification.error({
      message: 'Pin',
      description: e?.response?.data?.message || 'Could not pin this message.',
    })
  }
}

/** Unpin by API pin entry or thread message (`id`). */
async function unpinPinnedEntry(pinLike) {
  const mid = pinLike?.messageId != null
    ? String(pinLike.messageId)
    : (pinLike?.id != null ? String(pinLike.id) : '')
  const cid = active.value?.id
  if (!cid || !mid) {
    return
  }
  try {
    const res = await chatApi.unpinMessage(cid, mid)
    const data = unwrapChatData(res)
    if (active.value && Array.isArray(data?.pinnedMessages)) {
      active.value.pinnedMessages = data.pinnedMessages
    }
    notification.success({ message: 'Message unpinned.' })
  }
  catch (e) {
    console.error('unpinMessage', e)
    notification.error({
      message: 'Unpin',
      description: e?.response?.data?.message || 'Could not unpin this message.',
    })
  }
}

async function unpinAllPinned() {
  const cid = active.value?.id
  const snapshot = [...(active.value?.pinnedMessages ?? [])]
    .map(p => String(p.messageId ?? ''))
    .filter(Boolean)
  if (!cid || !snapshot.length) {
    return
  }
  try {
    for (const mid of snapshot) {
      const res = await chatApi.unpinMessage(cid, mid)
      const data = unwrapChatData(res)
      if (active.value && Array.isArray(data?.pinnedMessages)) {
        active.value.pinnedMessages = data.pinnedMessages
      }
    }
    notification.success({ message: 'All pins removed.' })
  }
  catch (e) {
    console.error('unpinAllPinned', e)
    notification.error({
      message: 'Unpin',
      description: e?.response?.data?.message || 'Could not remove all pins.',
    })
  }
}

async function unpinMessageRow(msg) {
  closeMessageActionMenu()
  await unpinPinnedEntry(msg)
}

function pinnedBannerPreview(pin) {
  const m = pin?.message
  if (!m) {
    return ''
  }
  const t = typeof m.text === 'string' ? m.text.trim() : ''
  if (t) {
    return t
  }
  const att = Array.isArray(m.attachments) ? m.attachments : []
  if (att.length) {
    return '[Attachment]'
  }
  return 'Message'
}

function onPinnedBannerClick(pin) {
  if (pin.unavailable) {
    notification.info({
      message: 'This message is no longer available.',
    })
    return
  }
  const mid = pin.messageId != null
    ? String(pin.messageId)
    : (pin.message?.id ? String(pin.message.id) : '')
  if (mid) {
    jumpToMessage(mid)
  }
}

function jumpToOriginalMessage(messageId) {
  closeMessageActionMenu()
  jumpToMessage(messageId)
}

function toggleThreadSearchPanel() {
  toggleThreadSearch()
}

function mediaItemFromRaw(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const id = raw.id != null ? String(raw.id) : ''
  if (!id) {
    return null
  }
  const images = (Array.isArray(raw.attachments) ? raw.attachments : [])
    .filter(a => a?.kind === 'image' && typeof a.url === 'string' && a.url.trim())
    .map(a => ({
      objectKey: typeof a.objectKey === 'string' ? a.objectKey : '',
      url: String(a.url),
    }))
  if (!images.length) {
    return null
  }
  return {
    id,
    senderUserId: raw.senderUserId != null ? String(raw.senderUserId) : '',
    createdAt: raw.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
    isOwn: myUserId.value != null && String(raw.senderUserId ?? '') === String(myUserId.value),
    images,
  }
}

function fileItemFromRaw(raw) {
  if (!raw || typeof raw !== 'object') {
    return null
  }
  const id = raw.id != null ? String(raw.id) : ''
  if (!id) {
    return null
  }
  const files = (Array.isArray(raw.attachments) ? raw.attachments : [])
    .filter(a => a?.kind === 'file' && typeof a.objectKey === 'string' && a.objectKey.trim())
    .map(a => ({
      objectKey: typeof a.objectKey === 'string' ? a.objectKey : '',
      url: typeof a.url === 'string' ? a.url : '',
      originalName: typeof a.originalName === 'string' ? a.originalName : 'File',
      contentType: typeof a.contentType === 'string' ? a.contentType : '',
      extension: typeof a.extension === 'string' ? a.extension : '',
      size: Number.isFinite(Number(a.size)) ? Number(a.size) : 0,
      fileCategory: typeof a.fileCategory === 'string' ? a.fileCategory : 'document',
      status: typeof a.status === 'string' ? a.status : 'pending_scan',
      scan: a.scan && typeof a.scan === 'object' ? a.scan : null,
      media: a.media && typeof a.media === 'object' ? a.media : null,
    }))
  if (!files.length) {
    return null
  }
  return {
    id,
    senderUserId: raw.senderUserId != null ? String(raw.senderUserId) : '',
    createdAt: raw.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
    isOwn: myUserId.value != null && String(raw.senderUserId ?? '') === String(myUserId.value),
    files,
  }
}

function linkItemFromRaw(raw) {
  if (!raw || typeof raw !== 'object') return null
  const id = raw.id != null ? String(raw.id) : ''
  if (!id) return null
  const links = (Array.isArray(raw.attachments) ? raw.attachments : [])
    .filter(a => a?.kind === 'link' && typeof a.url === 'string' && a.url.trim())
    .map(a => ({
      url: typeof a.url === 'string' ? a.url : '',
      normalizedUrl: typeof a.normalizedUrl === 'string' ? a.normalizedUrl : (typeof a.url === 'string' ? a.url : ''),
      domain: typeof a.domain === 'string' ? a.domain : '',
      title: typeof a.title === 'string' ? a.title : '',
      description: typeof a.description === 'string' ? a.description : '',
      imageUrl: typeof a.imageUrl === 'string' ? a.imageUrl : '',
    }))
  if (!links.length) return null
  return {
    id,
    senderUserId: raw.senderUserId != null ? String(raw.senderUserId) : '',
    createdAt: raw.createdAt ?? raw.updatedAt ?? new Date().toISOString(),
    isOwn: myUserId.value != null && String(raw.senderUserId ?? '') === String(myUserId.value),
    links,
  }
}

function syncMediaItemFromRaw(payload) {
  const cid = payload?.conversationId != null ? String(payload.conversationId) : ''
  if (!cid || String(active.value?.id ?? '') !== cid) {
    return
  }
  if (!mediaPanelLoaded.value && !groupDetailsOpen.value && !directDetailsOpen.value && !storageDrawerOpen.value) {
    return
  }
  const item = mediaItemFromRaw(payload.raw)
  if (item) {
    mediaPanelItems.value = [
      item,
      ...mediaPanelItems.value.filter(row => String(row.id) !== item.id),
    ]
  }
  const fileItem = fileItemFromRaw(payload.raw)
  if (fileItem && (filePanelLoaded.value || storageDrawerOpen.value)) {
    filePanelItems.value = [
      fileItem,
      ...filePanelItems.value.filter(row => String(row.id) !== fileItem.id),
    ]
  }
  const linkItem = linkItemFromRaw(payload.raw)
  if (linkItem && (linkPanelLoaded.value || storageDrawerOpen.value)) {
    linkPanelItems.value = [
      linkItem,
      ...linkPanelItems.value.filter(row => String(row.id) !== linkItem.id),
    ]
  }
}

function storageSenderLabel(item) {
  if (item?.isOwn) {
    return 'Bạn'
  }
  const sid = item?.senderUserId != null ? String(item.senderUserId) : ''
  if (active.value && !active.value.isGroup) {
    return active.value.peerName || active.value.name || 'Người gửi'
  }
  if (sid) {
    const row = groupSenderDisplayByUserId.value[sid]
    if (row?.name) {
      return row.name
    }
    const cached = chatUserMiniCache.get(sid)
    if (cached?.name) {
      return cached.name
    }
  }
  return 'Thành viên'
}

function resetMediaPanelState() {
  mediaPanelLoaded.value = false
  mediaPanelItems.value = []
  mediaPanelNextCursor.value = null
  mediaPanelHasMore.value = false
  mediaPanelLoading.value = false
  filePanelLoaded.value = false
  filePanelItems.value = []
  filePanelNextCursor.value = null
  filePanelHasMore.value = false
  filePanelLoading.value = false
  linkPanelLoaded.value = false
  linkPanelItems.value = []
  linkPanelNextCursor.value = null
  linkPanelHasMore.value = false
  linkPanelLoading.value = false
}

async function fetchConversationMedia({ append = false } = {}) {
  const cid = active.value?.id
  if (!cid || mediaPanelLoading.value) {
    return
  }
  mediaPanelLoading.value = true
  try {
    const res = await chatApi.listConversationMedia(cid, {
      chunkSize: 36,
      ...(append && mediaPanelNextCursor.value
        ? { cursor: mediaPanelNextCursor.value }
        : {}),
    })
    const data = unwrapChatData(res)
    const rows = Array.isArray(data?.items) ? data.items : []
    mediaPanelItems.value = append
      ? [...mediaPanelItems.value, ...rows]
      : rows
    mediaPanelLoaded.value = true
    mediaPanelNextCursor.value = data?.nextCursor ?? null
    mediaPanelHasMore.value = Boolean(data?.hasMore)
  }
  catch (e) {
    console.error('listConversationMedia', e)
    notification.error({
      message: 'Ảnh đã gửi',
      description: e?.response?.data?.message || 'Không tải được danh sách ảnh.',
    })
  }
  finally {
    mediaPanelLoading.value = false
  }
}

async function fetchConversationFiles({ append = false } = {}) {
  const cid = active.value?.id
  if (!cid || filePanelLoading.value) {
    return
  }
  filePanelLoading.value = true
  try {
    const res = await chatApi.listConversationFiles(cid, {
      chunkSize: 36,
      ...(append && filePanelNextCursor.value
        ? { cursor: filePanelNextCursor.value }
        : {}),
    })
    const data = unwrapChatData(res)
    const rows = Array.isArray(data?.items) ? data.items : []
    filePanelItems.value = append
      ? [...filePanelItems.value, ...rows]
      : rows
    filePanelLoaded.value = true
    filePanelNextCursor.value = data?.nextCursor ?? null
    filePanelHasMore.value = Boolean(data?.hasMore)
  }
  catch (e) {
    console.error('listConversationFiles', e)
    notification.error({
      message: 'Files',
      description: e?.response?.data?.message || 'Không tải được danh sách file.',
    })
  }
  finally {
    filePanelLoading.value = false
  }
}

async function fetchConversationLinks({ append = false } = {}) {
  const cid = active.value?.id
  if (!cid || linkPanelLoading.value) return
  linkPanelLoading.value = true
  try {
    const res = await chatApi.listConversationLinks(cid, {
      chunkSize: 36,
      ...(append && linkPanelNextCursor.value ? { cursor: linkPanelNextCursor.value } : {}),
    })
    const data = unwrapChatData(res)
    const rows = Array.isArray(data?.items) ? data.items : []
    linkPanelItems.value = append ? [...linkPanelItems.value, ...rows] : rows
    linkPanelLoaded.value = true
    linkPanelNextCursor.value = data?.nextCursor ?? null
    linkPanelHasMore.value = Boolean(data?.hasMore)
  } catch (e) {
    console.error('listConversationLinks', e)
    notification.error({
      message: 'Links',
      description: e?.response?.data?.message || 'Không tải được danh sách link.',
    })
  } finally {
    linkPanelLoading.value = false
  }
}

async function onGroupDrawerMediaPick(item) {
  const id = item?.id != null ? String(item.id) : ''
  if (!id) {
    return
  }
  groupDetailsOpen.value = false
  directDetailsOpen.value = false
  storageDrawerOpen.value = false
  await jumpToMessage(id)
}

async function openStorageDrawer(tab = 'media') {
  storageDrawerTab.value = tab
  groupDetailsOpen.value = false
  directDetailsOpen.value = false
  storageDrawerOpen.value = true
  if (tab === 'files' && !filePanelLoaded.value) {
    await fetchConversationFiles({ append: false })
  }
  if (tab === 'links' && !linkPanelLoaded.value) {
    await fetchConversationLinks({ append: false })
  }
  if (tab === 'media' && !mediaPanelLoaded.value) {
    await fetchConversationMedia({ append: false })
  }
}

async function onDirectDrawerOpenProfile(conv) {
  directDetailsOpen.value = false
  await openPeerProfile(conv)
}

const messageListRef = ref(null)
const groupDrawerRef = ref(null)

watchEffect(() => {
  const root = messageListRef.value?.scrollRoot
  messagesScrollEl.value = root ?? null
})

watch(selectedId, () => {
  storageDrawerOpen.value = false
  resetMediaPanelState()
})

watch(storageDrawerTab, (tab) => {
  if (!storageDrawerOpen.value) {
    return
  }
  if (tab === 'files' && !filePanelLoaded.value) {
    void fetchConversationFiles({ append: false })
  } else if (tab === 'links' && !linkPanelLoaded.value) {
    void fetchConversationLinks({ append: false })
  } else if (tab === 'media' && !mediaPanelLoaded.value) {
    void fetchConversationMedia({ append: false })
  }
})

function incomingAvatarKey(msg) {
  if (active.value?.isGroup && !msg?.me && msg?.senderUserId != null) {
    return String(msg.senderUserId)
  }
  return active.value?.id != null ? String(active.value.id) : 'peer'
}

function groupMessageSender(msg) {
  const sid = msg?.senderUserId != null ? String(msg.senderUserId) : ''
  if (!sid) {
    return { name: 'Thành viên', avatarUrl: '' }
  }
  const row = groupSenderDisplayByUserId.value[sid]
  if (row) {
    return { name: row.name, avatarUrl: row.avatarUrl }
  }
  return { name: 'Thành viên', avatarUrl: '' }
}

function displayNameForGroupEvent(uid) {
  const id = uid != null ? String(uid) : ''
  if (!id) {
    return 'Thành viên'
  }
  const row = groupSenderDisplayByUserId.value[id]
  if (row?.name) {
    return row.name
  }
  const c = chatUserMiniCache.get(id)
  if (c?.name && String(c.name).trim()) {
    return String(c.name).trim()
  }
  return 'Thành viên'
}

/** Tin hệ thống nhóm (kiểu Zalo) — có metadata.group_event + tên đã hydrate */
function groupEventLineText(msg) {
  const m = msg?.metadata
  if (m?.kind !== 'group_event') {
    return typeof msg?.text === 'string' ? msg.text : ''
  }
  const ev = m.event
  const actorN = m.actorUserId ? displayNameForGroupEvent(m.actorUserId) : 'Quản trị viên'
  const subjects = Array.isArray(m.subjectUserIds) ? m.subjectUserIds : []
  const rawText = typeof msg?.text === 'string' ? msg.text : ''
  switch (ev) {
    case 'group_created':
      return rawText
    case 'members_added': {
      if (!subjects.length) {
        return rawText
      }
      const ns = subjects.map(id => displayNameForGroupEvent(id)).join(', ')
      return `${actorN} đã mời ${ns} vào nhóm.`
    }
    case 'member_removed': {
      const t = subjects[0]
      return t ? `${actorN} đã xóa ${displayNameForGroupEvent(t)} khỏi nhóm.` : rawText
    }
    case 'member_left': {
      const t = subjects[0]
      return t ? `${displayNameForGroupEvent(t)} đã rời khỏi nhóm.` : rawText
    }
    case 'group_renamed': {
      const nn = m.newGroupName
      return nn ? `${actorN} đã đổi tên nhóm thành «${nn}».` : rawText
    }
    case 'group_avatar_changed':
      return `${actorN} đã đổi ảnh đại diện nhóm.`
    case 'admin_transferred': {
      const na = m.newAdminUserId
      return na
        ? `${actorN} đã chuyển quyền quản trị cho ${displayNameForGroupEvent(na)}.`
        : rawText
    }
    default:
      return rawText
  }
}

function openIncomingSenderProfile(msg) {
  const sid = msg?.senderUserId != null ? String(msg.senderUserId) : ''
  if (!sid) {
    return
  }
  void openUserProfileById(sid)
}

const messageListApi = computed(() => ({
  timeLabel,
  isSystemMessage,
  isCallLogMessage,
  callLogIcon,
  callLogTitle,
  callLogCardTitle,
  callLogTone,
  callLogDuration,
  isAvatarBroken,
  openPeerProfile,
  initials,
  fallbackClass,
  shouldShowMessageActions,
  onMessageActionHoverEnter,
  onMessageActionHoverLeave,
  startReplyToMessage,
  copyMessageToClipboard,
  toggleMessageActionMenu,
  isMessageActionMenuOpen,
  pinMessageRow,
  isPinnedMessageId,
  canPinAnotherMessage,
  unpinMessageRow,
  recallMessageForEveryone,
  jumpToOriginalMessage,
  toggleOutgoingReceiptDetail,
  shouldShowOutgoingReceipt,
  receiptLabel,
  directSeenDisplay,
  groupSeenDisplay,
  incomingAvatarKey,
  groupMessageSender,
  openIncomingSenderProfile,
  groupEventLineText,
  isGroupToolMessage,
  groupToolFromMessage,
  formatToolDate,
  formatFileSize,
  chatFileIcon,
  chatFileIsVideo,
  chatFileStatusText,
  chatFileCanDownload,
  pollOptionPercent,
  pollOptionChecked,
  voteGroupPoll,
  addGroupPollOptionFromCard,
  cancelGroupReminder,
  editGroupNoteFromCard,
  deleteGroupNoteFromCard,
}))

function shouldShowOutgoingReceipt(messages, messageId, conv) {
  if (!readReceiptsEnabled.value) {
    return false
  }
  if (messageId == null || !conv) {
    return false
  }
  const mid = String(messageId)
  const lastOwn = lastOwnUiMessageId(messages)
  if (conv.isGroup) {
    const msg = messages.find(m => String(m.id) === mid)
    const hasSeen = Array.isArray(msg?.groupSeenByUserIds) && msg.groupSeenByUserIds.length > 0
    if (!msg?.me && hasSeen) {
      return receiptDetailForMessageId.value === mid
    }
    if (hasSeen) {
      return lastOwn === mid || receiptDetailForMessageId.value === mid
    }
    return lastOwn != null && lastOwn === mid
  }
  const label = outgoingMessageReceiptLabel(conv, messageId, myUserId.value)
  if (!label) {
    return false
  }
  if (lastOwn != null && lastOwn === mid) {
    return true
  }
  return receiptDetailForMessageId.value === mid
}

function receiptLabel(conv, messageId) {
  if (!readReceiptsEnabled.value) {
    return ''
  }
  return outgoingMessageReceiptLabel(conv, messageId, myUserId.value)
}

function directSeenDisplay(conv, messageId) {
  if (!readReceiptsEnabled.value) {
    return []
  }
  if (!conv || conv.isGroup) {
    return []
  }
  if (outgoingMessageReceiptLabel(conv, messageId, myUserId.value) !== 'Đã xem') {
    return []
  }
  const id = conv.peerUserId != null ? String(conv.peerUserId) : String(conv.id || 'peer')
  const url = conv.peerAvatarUrl || ''
  const name = conv.name || 'User'
  return [{
    id,
    url,
    initials: initials(name),
  }]
}

function peerLastSeenSubtitle(conv) {
  if (!conv || conv.online || conv.presenceHidden) {
    return ''
  }
  const ms = conv.peerLastSeenAt
  if (ms == null || !Number.isFinite(ms)) {
    return ''
  }
  const diff = Date.now() - ms
  if (diff < 60_000) {
    return 'Just offline'
  }
  if (diff < 3600_000) {
    const m = Math.max(1, Math.floor(diff / 60_000))
    return `${m} min ago`
  }
  if (diff < 86_400_000) {
    const h = Math.max(1, Math.floor(diff / 3600_000))
    return `${h} h ago`
  }
  const d = Math.floor(diff / 86_400_000)
  return d < 2 ? 'Yesterday' : `${d} days ago`
}

async function fetchPresenceSettings() {
  try {
    const res = await chatApi.getPresenceSettings()
    const data = unwrapChatData(res)
    applyAccountSettings(data?.setting)
  } catch (e) {
    console.error('presence settings', e)
  }
}

function applyAccountSettings(setting) {
  activeStatusVisible.value = setting?.activeStatusVisible !== false
  notificationSoundEnabled.value = setting?.notificationSoundEnabled !== false
  messagePreviewEnabled.value = setting?.messagePreviewEnabled !== false
  readReceiptsEnabled.value = setting?.readReceiptsEnabled !== false
  typingStatusVisible.value = setting?.typingStatusVisible !== false
  messageRequestsFrom.value = ['everyone', 'mutual_follow', 'following'].includes(setting?.messageRequestsFrom)
    ? setting.messageRequestsFrom
    : 'everyone'
  if (import.meta.client) {
    localStorage.setItem('chatAccountSettings', JSON.stringify({
      notificationSoundEnabled: notificationSoundEnabled.value,
      messagePreviewEnabled: messagePreviewEnabled.value,
    }))
  }
}

async function patchAccountSetting(key, value) {
  accountSettingSavingKey.value = key
  try {
    const body = { [key]: value }
    const res = await chatApi.patchPresenceSettings(body)
    const data = unwrapChatData(res)
    applyAccountSettings(data?.setting)
    if (key === 'activeStatusVisible') {
      await applyPresenceToConversations(conversations.value)
    }
    if (key === 'typingStatusVisible' && value === false) {
      stopTypingNow()
    }
    notification.success({ message: 'Đã cập nhật cài đặt' })
  } catch (e) {
    console.error('patch account setting', e)
    notification.error({
      message: 'Cài đặt tài khoản',
      description: e?.response?.data?.message || 'Không cập nhật được cài đặt.'
    })
  } finally {
    accountSettingSavingKey.value = ''
  }
}

async function toggleActiveStatusVisible() {
  activeStatusLoading.value = true
  try {
    const next = !activeStatusVisible.value
    const res = await chatApi.patchPresenceSettings({ activeStatusVisible: next })
    const data = unwrapChatData(res)
    applyAccountSettings(data?.setting)
    await applyPresenceToConversations(conversations.value)
    notification.success({
      message: activeStatusVisible.value
        ? 'Đã bật trạng thái hoạt động'
        : 'Đã tắt trạng thái hoạt động',
      description: activeStatusVisible.value
        ? undefined
        : 'Người khác sẽ không thấy bạn online và bạn cũng không thấy trạng thái của họ.'
    })
  } catch (e) {
    console.error('toggle active status', e)
    notification.error({
      message: 'Trạng thái hoạt động',
      description: e?.response?.data?.message || 'Không cập nhật được trạng thái hoạt động.'
    })
  } finally {
    activeStatusLoading.value = false
  }
}

function openAccountSettings() {
  accountSettingsOpen.value = true
  fetchPresenceSettings()
}

function selectConversation(id) {
  unlockNotifyAudio()
  selectedId.value = id
  mobileShowThread.value = true
}

function backToList() {
  mobileShowThread.value = false
}

function startAudioCall() {
  if (!messagingAllowed.value) {
    return
  }
  if (active.value?.isGroup) {
    startGroupCall(CALL_TYPE.AUDIO)
    return
  }
  startOutgoingCall(CALL_TYPE.AUDIO)
}

function startVideoCall() {
  if (!messagingAllowed.value) {
    return
  }
  if (active.value?.isGroup) {
    startGroupCall(CALL_TYPE.VIDEO)
    return
  }
  startOutgoingCall(CALL_TYPE.VIDEO)
}

async function setConversationNotificationMute(duration) {
  const cid = active.value?.id
  if (!cid) {
    return
  }
  const body = duration === 'off'
    ? { mute: false }
    : { mute: true, duration }
  try {
    const res = await chatApi.patchConversationNotification(cid, body)
    const data = unwrapChatData(res)
    const raw = data?.conversation ?? data
    const notificationState = raw?.notification ?? data?.notification ?? { muted: false }
    active.value.notification = notificationState
    active.value.notificationMuted = Boolean(notificationState.muted)
    active.value.notificationMutedUntil = notificationState.mutedUntil ?? null
    active.value.notificationMutedForever = Boolean(notificationState.mutedForever)
    notification.success({
      message: notificationState.muted ? 'Đã tắt thông báo' : 'Đã bật thông báo'
    })
  }
  catch (e) {
    console.error('notification mute', e)
    notification.error({
      message: 'Thông báo',
      description: e?.response?.data?.message || 'Không cập nhật được thông báo.'
    })
  }
}

function confirmClearConversationHistory() {
  const cid = active.value?.id
  if (!cid) return
  Modal.confirm({
    title: 'Xóa lịch sử trò chuyện?',
    content: 'Chỉ xóa lịch sử ở phía bạn. Người khác vẫn xem được các tin nhắn cũ.',
    okText: 'Xóa',
    okType: 'danger',
    cancelText: 'Hủy',
    async onOk() {
      try {
        const res = await chatApi.clearConversationHistory(cid)
        const data = unwrapChatData(res)
        active.value.messages = []
        active.value.lastMessage = ''
        active.value.lastMessagePreview = null
        active.value.lastMessageId = null
        active.value.lastMessageAt = null
        active.value.unreadCount = 0
        if (data?.conversation) {
          active.value.historyCleared = Boolean(data.conversation.historyCleared)
        }
        resetMediaPanelState()
        threadSearchOpen.value = false
        threadSearchResults.value = []
        await loadConversationList()
        notification.success({ message: 'Đã xóa lịch sử trò chuyện' })
      } catch (e) {
        console.error('clear conversation history', e)
        notification.error({
          message: 'Xóa lịch sử',
          description: e?.response?.data?.message || 'Không xóa được lịch sử trò chuyện.',
        })
      }
    },
  })
}

function endCall() {
  hangupActiveCall('hangup')
}

function onComposerKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

function initials(name) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const groupSeenAvatarByUserId = ref({})
const groupSeenAvatarFetched = new Set()
const groupToolCache = ref({})
const createPollOpen = ref(false)
const createPollSubmitting = ref(false)
const pollQuestion = ref('')
const pollOptions = ref(['', ''])
const pollDeadline = ref('')
const pollAllowMultiple = ref(false)
const pollAllowAddOptions = ref(true)
const createReminderOpen = ref(false)
const createReminderSubmitting = ref(false)
const reminderTitle = ref('')
const reminderDescription = ref('')
const reminderAt = ref('')
const reminderTarget = ref('all')
const reminderTargetUserIds = ref([])
const reminderMemberRows = ref([])
const createNoteOpen = ref(false)
const createNoteSubmitting = ref(false)
const noteTitle = ref('')
const noteContent = ref('')
const notePinned = ref(false)

function groupToolKey(type, id) {
  return `${String(type || '')}:${String(id || '')}`
}

function rememberGroupTool(type, tool) {
  if (!type || !tool?.id) {
    return
  }
  groupToolCache.value = {
    ...groupToolCache.value,
    [groupToolKey(type, tool.id)]: tool,
  }
}

function localDateTimeValue(date) {
  const d = date instanceof Date ? date : new Date(date)
  if (!Number.isFinite(d.getTime())) {
    return ''
  }
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function futureDateTimeValue(minutes) {
  return localDateTimeValue(new Date(Date.now() + minutes * 60_000))
}

function groupToolFromMessage(msg) {
  const meta = msg?.metadata || {}
  const type = meta.toolType ? String(meta.toolType) : ''
  const id = meta.toolId ? String(meta.toolId) : ''
  if (!type || !id) {
    return null
  }
  return groupToolCache.value[groupToolKey(type, id)] || meta.toolSnapshot || null
}

function isGroupToolMessage(msg) {
  return Boolean(groupToolFromMessage(msg))
}

function formatToolDate(value) {
  const d = value ? new Date(value) : null
  if (!d || !Number.isFinite(d.getTime())) {
    return ''
  }
  return d.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  let value = n
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function chatFileIcon(file) {
  const ext = String(file?.extension || '').toLowerCase()
  if (['doc', 'docx'].includes(ext)) return 'fa-regular fa-file-word text-blue-600'
  if (['xls', 'xlsx'].includes(ext)) return 'fa-regular fa-file-excel text-emerald-600'
  if (['ppt', 'pptx'].includes(ext)) return 'fa-regular fa-file-powerpoint text-orange-600'
  if (['mp4', 'mov'].includes(ext)) return 'fa-solid fa-file-video text-violet-600'
  return 'fa-regular fa-file-lines text-zinc-600'
}

function chatFileIsVideo(file) {
  const ext = String(file?.extension || '').toLowerCase()
  const type = String(file?.contentType || '').toLowerCase()
  return ['mp4', 'mov'].includes(ext) || type.startsWith('video/')
}

function chatFileStatusText(file) {
  if (file?.status === 'ready') return 'Sẵn sàng tải xuống'
  if (file?.status === 'blocked') return 'File bị chặn vì không an toàn'
  if (file?.status === 'failed') return 'Kiểm tra file thất bại'
  return 'Đang kiểm tra an toàn...'
}

function chatFileCanDownload(file) {
  return file?.status === 'ready' && Boolean(file?.url)
}

function pollOptionPercent(tool, option) {
  const total = Number(tool?.totalVotes || 0)
  if (!total) {
    return 0
  }
  return Math.round((Number(option?.voteCount || 0) / total) * 100)
}

function pollOptionChecked(tool, optionId) {
  return Array.isArray(tool?.myOptionIds) && tool.myOptionIds.map(String).includes(String(optionId))
}

function openCreatePollModal() {
  if (!active.value?.isGroup || !messagingAllowed.value) {
    return
  }
  pollQuestion.value = ''
  pollOptions.value = ['', '']
  pollDeadline.value = futureDateTimeValue(60)
  pollAllowMultiple.value = false
  pollAllowAddOptions.value = true
  createPollOpen.value = true
}

function addPollOptionInput() {
  if (pollOptions.value.length >= 20) {
    return
  }
  pollOptions.value = [...pollOptions.value, '']
}

function removePollOptionInput(index) {
  if (pollOptions.value.length <= 2) {
    return
  }
  pollOptions.value = pollOptions.value.filter((_, i) => i !== index)
}

async function submitCreatePoll() {
  const cid = active.value?.id
  const question = pollQuestion.value.trim()
  const options = pollOptions.value.map(x => String(x || '').trim()).filter(Boolean)
  if (!cid || !active.value?.isGroup) {
    return
  }
  if (!question || options.length < 2) {
    notification.warning({ message: 'Nhập chủ đề và ít nhất 2 lựa chọn' })
    return
  }
  createPollSubmitting.value = true
  try {
    const res = await chatApi.createGroupPoll(cid, {
      question,
      options,
      deadlineAt: new Date(pollDeadline.value).toISOString(),
      allowMultiple: pollAllowMultiple.value,
      allowAddOptions: pollAllowAddOptions.value,
    })
    const d = unwrapChatData(res)
    rememberGroupTool('poll', d?.poll)
    createPollOpen.value = false
    notification.success({ message: 'Đã tạo bình chọn' })
  }
  catch (e) {
    console.error('create poll', e)
    notification.error({
      message: 'Bình chọn',
      description: e?.response?.data?.message || 'Không tạo được bình chọn.',
    })
  }
  finally {
    createPollSubmitting.value = false
  }
}

async function voteGroupPoll(tool, optionId) {
  const cid = active.value?.id || tool?.conversationId
  if (!cid || !tool?.id) {
    return
  }
  if (tool.status !== 'active') {
    notification.warning({
      message: 'Bình chọn đã hết hạn',
      description: 'Poll này đã đóng nên không thể tiếp tục vote.',
    })
    return
  }
  const cur = Array.isArray(tool.myOptionIds) ? tool.myOptionIds.map(String) : []
  const oid = String(optionId)
  const next = tool.allowMultiple
    ? (cur.includes(oid) ? cur.filter(x => x !== oid) : [...cur, oid])
    : [oid]
  if (!next.length) {
    notification.warning({ message: 'Chọn ít nhất một lựa chọn' })
    return
  }
  try {
    const res = await chatApi.voteGroupPoll(cid, tool.id, next)
    const d = unwrapChatData(res)
    rememberGroupTool('poll', d?.poll)
  }
  catch (e) {
    console.error('vote poll', e)
    notification.error({
      message: 'Bình chọn',
      description: e?.response?.status === 409
        ? 'Bình chọn đã hết hạn hoặc đã đóng.'
        : (e?.response?.data?.message || 'Không gửi được vote.'),
    })
  }
}

async function addGroupPollOptionFromCard(tool) {
  const text = window.prompt('Thêm lựa chọn')
  if (!text?.trim()) {
    return
  }
  try {
    const res = await chatApi.addGroupPollOption(active.value?.id || tool.conversationId, tool.id, text.trim())
    const d = unwrapChatData(res)
    rememberGroupTool('poll', d?.poll)
  }
  catch (e) {
    console.error('add poll option', e)
    notification.error({
      message: 'Bình chọn',
      description: e?.response?.data?.message || 'Không thêm được lựa chọn.',
    })
  }
}

async function openCreateReminderModal() {
  if (!active.value || !messagingAllowed.value) {
    return
  }
  reminderTitle.value = ''
  reminderDescription.value = ''
  reminderAt.value = futureDateTimeValue(30)
  reminderTarget.value = 'all'
  reminderTargetUserIds.value = []
  reminderMemberRows.value = []
  for (const p of active.value.participants || []) {
    if (!p?.userId || p.leftAt || p.removedByAdminAt) {
      continue
    }
    const uid = String(p.userId)
    const mini = await getChatUserDisplay(uid)
    reminderMemberRows.value.push({ id: uid, ...mini })
  }
  createReminderOpen.value = true
}

function toggleReminderTargetUser(userId) {
  const id = String(userId)
  const cur = reminderTargetUserIds.value.map(String)
  reminderTargetUserIds.value = cur.includes(id)
    ? cur.filter(x => x !== id)
    : [...cur, id]
}

async function submitCreateReminder() {
  const cid = active.value?.id
  const title = reminderTitle.value.trim()
  if (!cid || !title) {
    notification.warning({ message: 'Nhập tiêu đề nhắc hẹn' })
    return
  }
  createReminderSubmitting.value = true
  try {
    const res = await chatApi.createGroupReminder(cid, {
      title,
      description: reminderDescription.value.trim(),
      remindAt: new Date(reminderAt.value).toISOString(),
      target: reminderTarget.value,
      targetUserIds: reminderTarget.value === 'members' ? reminderTargetUserIds.value : [],
    })
    const d = unwrapChatData(res)
    rememberGroupTool('reminder', d?.reminder)
    createReminderOpen.value = false
    notification.success({ message: 'Đã tạo nhắc hẹn' })
  }
  catch (e) {
    console.error('create reminder', e)
    notification.error({
      message: 'Nhắc hẹn',
      description: e?.response?.data?.message || 'Không tạo được nhắc hẹn.',
    })
  }
  finally {
    createReminderSubmitting.value = false
  }
}

async function cancelGroupReminder(tool) {
  if (!tool?.id || tool.status !== 'scheduled') {
    return
  }
  try {
    const res = await chatApi.cancelGroupReminder(active.value?.id || tool.conversationId, tool.id)
    const d = unwrapChatData(res)
    rememberGroupTool('reminder', d?.reminder)
  }
  catch (e) {
    console.error('cancel reminder', e)
    notification.error({
      message: 'Nhắc hẹn',
      description: e?.response?.data?.message || 'Không hủy được nhắc hẹn.',
    })
  }
}

function openCreateNoteModal() {
  if (!active.value?.isGroup || !messagingAllowed.value) {
    return
  }
  noteTitle.value = ''
  noteContent.value = ''
  notePinned.value = false
  createNoteOpen.value = true
}

async function submitCreateNote() {
  const cid = active.value?.id
  const title = noteTitle.value.trim()
  if (!cid || !active.value?.isGroup || !title) {
    notification.warning({ message: 'Nhập tiêu đề ghi chú' })
    return
  }
  createNoteSubmitting.value = true
  try {
    const res = await chatApi.createGroupNote(cid, {
      title,
      content: noteContent.value.trim(),
      pinned: notePinned.value,
    })
    const d = unwrapChatData(res)
    rememberGroupTool('note', d?.note)
    createNoteOpen.value = false
    notification.success({ message: 'Đã tạo ghi chú' })
  }
  catch (e) {
    console.error('create note', e)
    notification.error({
      message: 'Ghi chú',
      description: e?.response?.data?.message || 'Không tạo được ghi chú.',
    })
  }
  finally {
    createNoteSubmitting.value = false
  }
}

async function editGroupNoteFromCard(tool) {
  if (!tool?.id || tool.deleted) {
    return
  }
  const title = window.prompt('Tiêu đề ghi chú', tool.title || '')
  if (title == null) {
    return
  }
  const content = window.prompt('Nội dung ghi chú', tool.content || '')
  if (content == null) {
    return
  }
  try {
    const res = await chatApi.updateGroupNote(active.value?.id || tool.conversationId, tool.id, {
      title: title.trim(),
      content: content.trim(),
      pinned: Boolean(tool.pinned),
    })
    const d = unwrapChatData(res)
    rememberGroupTool('note', d?.note)
  }
  catch (e) {
    console.error('edit note', e)
    notification.error({
      message: 'Ghi chú',
      description: e?.response?.data?.message || 'Không sửa được ghi chú.',
    })
  }
}

async function deleteGroupNoteFromCard(tool) {
  if (!tool?.id || tool.deleted) {
    return
  }
  const ok = await confirmTitleHtml('Xóa ghi chú nhóm này?')
  if (!ok) {
    return
  }
  try {
    await chatApi.deleteGroupNote(active.value?.id || tool.conversationId, tool.id)
    rememberGroupTool('note', { ...tool, deleted: true })
  }
  catch (e) {
    console.error('delete note', e)
    notification.error({
      message: 'Ghi chú',
      description: e?.response?.data?.message || 'Không xóa được ghi chú.',
    })
  }
}

async function ensureAvatarForSeenUser(uid) {
  const id = String(uid)
  if (!id || groupSeenAvatarFetched.has(id)) {
    return
  }
  groupSeenAvatarFetched.add(id)
  try {
    const token = import.meta.client ? localStorage.getItem('token') : null
    const res = await profileService.fetchByUserId(id, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const raw = res?.data?.data ?? res?.data
    const user = raw?.user ?? raw
    const pic = user?.profile_picture
    groupSeenAvatarByUserId.value = {
      ...groupSeenAvatarByUserId.value,
      [id]: pic ? resolveMediaUrl(pic) : '',
    }
  }
  catch {
    console.warn('ensureAvatarForSeenUser', id)
    groupSeenAvatarByUserId.value = {
      ...groupSeenAvatarByUserId.value,
      [id]: '',
    }
  }
}

watch(
  () => active.value?.messages,
  (msgs) => {
    if (!active.value?.isGroup || !Array.isArray(msgs)) {
      return
    }
    for (const m of msgs) {
      if (m?.metadata?.kind === 'group_event') {
        const meta = m.metadata
        const ids = []
        if (meta.actorUserId) {
          ids.push(String(meta.actorUserId))
        }
        if (Array.isArray(meta.subjectUserIds)) {
          ids.push(...meta.subjectUserIds.map(String))
        }
        if (meta.newAdminUserId) {
          ids.push(String(meta.newAdminUserId))
        }
        for (const uid of [...new Set(ids)]) {
          void ensureGroupSenderDisplay(uid)
        }
      }
    }
    for (const m of msgs) {
      if (!Array.isArray(m.groupSeenByUserIds) || !m.groupSeenByUserIds.length) {
        continue
      }
      for (const uid of m.groupSeenByUserIds) {
        void ensureAvatarForSeenUser(uid)
      }
    }
    for (const m of msgs) {
      if (m?.me || isSystemMessage(m)) {
        continue
      }
      const sid = m?.senderUserId != null ? String(m.senderUserId) : ''
      if (sid) {
        void ensureGroupSenderDisplay(sid)
      }
    }
  },
  { deep: true },
)

function groupSeenDisplay(msg) {
  if (!readReceiptsEnabled.value) {
    return []
  }
  if (!msg?.groupSeenByUserIds?.length) {
    return []
  }
  return msg.groupSeenByUserIds.map((id) => {
    const sid = String(id)
    const url = groupSeenAvatarByUserId.value[sid] || ''
    return {
      id: sid,
      url,
      initials: initials(`U ${sid.replace(/-/g, '').slice(0, 6)}`),
    }
  })
}

const createGroupOpen = ref(false)
const createGroupName = ref('')
const createGroupSelectedUserIds = ref([])
const createGroupMutualRows = ref([])
const createGroupListLoading = ref(false)
const MAX_GROUP_MEMBERS = 10
const MAX_GROUP_INVITEES = MAX_GROUP_MEMBERS - 1

async function openCreateGroupModal() {
  createGroupOpen.value = true
  createGroupName.value = ''
  createGroupSelectedUserIds.value = []
  createGroupMutualRows.value = []
  await Promise.all([
    followStore.fetchFollowingList(),
    followStore.fetchFollowersList(),
  ])
  const following = new Set(
    (followStore.followingList || []).map(x => String(x)),
  )
  const ids = [...new Set(
    (followStore.followersList || [])
      .map(x => String(x))
      .filter(id => following.has(id)),
  )]
  createGroupListLoading.value = true
  try {
    const token = import.meta.client ? localStorage.getItem('token') : null
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const rows = await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await profileService.fetchByUserId(id, { headers })
          const raw = res?.data?.data ?? res?.data
          const user = raw?.user ?? raw
          const name = (user?.name && String(user.name).trim()) || user?.username || 'User'
          const username = user?.username ? String(user.username) : ''
          const pic = user?.profile_picture
          return {
            id: String(id),
            name,
            username,
            avatarUrl: pic ? resolveMediaUrl(pic) : '',
          }
        }
        catch {
          return {
            id: String(id),
            name: 'User',
            username: '',
            avatarUrl: '',
          }
        }
      }),
    )
    rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    createGroupMutualRows.value = rows
  }
  finally {
    createGroupListLoading.value = false
  }
}

function toggleCreateGroupMember(userId) {
  const id = String(userId)
  const cur = createGroupSelectedUserIds.value.map(String)
  const i = cur.indexOf(id)
  if (i >= 0) {
    createGroupSelectedUserIds.value = cur.filter(x => x !== id)
  }
  else {
    if (cur.length >= MAX_GROUP_INVITEES) {
      notification.warning({
        message: 'Nhóm đã đủ thành viên',
        description: `Một nhóm tối đa ${MAX_GROUP_MEMBERS} thành viên, bao gồm bạn.`,
      })
      return
    }
    createGroupSelectedUserIds.value = [...cur, id]
  }
}

async function submitCreateGroup() {
  const name = createGroupName.value.trim()
  if (!name) {
    notification.warning({ message: 'Nhập tên nhóm' })
    return
  }
  const picked = createGroupSelectedUserIds.value.map(String)
  if (picked.length < 2) {
    notification.warning({
      message: 'Chọn ít nhất 2 người',
      description: 'Nhóm cần tối thiểu 3 người gồm bạn và hai người bạn follow lẫn nhau.',
    })
    return
  }
  if (picked.length > MAX_GROUP_INVITEES) {
    notification.warning({
      message: 'Nhóm đã đủ thành viên',
      description: `Một nhóm tối đa ${MAX_GROUP_MEMBERS} thành viên, bao gồm bạn.`,
    })
    return
  }
  try {
    const res = await chatApi.createGroup({
      groupName: name,
      participantIds: picked,
    })
    const d = unwrapChatData(res)
    const raw = d && typeof d === 'object' && 'conversation' in d ? d.conversation : d
    const id = raw && raw.id != null ? String(raw.id) : ''
    if (id) {
      await loadConversationList()
      selectConversation(id)
    }
    createGroupOpen.value = false
    notification.success({ message: 'Đã tạo nhóm' })
  }
  catch (e) {
    console.error('createGroup', e)
    notification.error({
      message: 'Tạo nhóm',
      description: e?.response?.data?.message || e?.message || 'Không tạo được nhóm.',
    })
  }
}

async function hydrateGroupDetailMemberRows() {
  const c = active.value
  if (!c?.isGroup || !Array.isArray(c.participants)) {
    groupDetailMemberRows.value = []
    return
  }
  groupMembersHydrateLoading.value = true
  try {
    const mine = myUserId.value != null ? String(myUserId.value) : ''
    const adminId = c.adminUserId != null ? String(c.adminUserId) : ''
    const rows = []
    for (const p of c.participants) {
      if (!p?.userId) {
        continue
      }
      const uid = String(p.userId)
      const mini = await getChatUserDisplay(uid)
      rows.push({
        userId: uid,
        name: mini.name,
        username: mini.username,
        avatarUrl: mini.avatarUrl,
        initials: initials(mini.name || 'U'),
        isAdmin: uid === adminId || p.role === 'admin',
        hasLeft: Boolean(p.leftAt),
        removedByAdmin: Boolean(p.removedByAdminAt),
        isSelf: mine !== '' && uid === mine,
      })
    }
    rows.sort((a, b) => {
      if (a.hasLeft !== b.hasLeft) {
        return a.hasLeft ? 1 : -1
      }
      return a.name.localeCompare(b.name, 'vi')
    })
    groupDetailMemberRows.value = rows
  }
  finally {
    groupMembersHydrateLoading.value = false
  }
}

async function buildAddMemberCandidateList() {
  const c = active.value
  addMemberCandidates.value = []
  if (!c?.isGroup) {
    return
  }
  if (!c.adminUserId || String(c.adminUserId) !== String(myUserId.value)) {
    return
  }
  addMembersListLoading.value = true
  try {
    await Promise.all([
      followStore.fetchFollowingList(),
      followStore.fetchFollowersList(),
    ])
    const following = new Set(
      (followStore.followingList || []).map(x => String(x)),
    )
    const mine = myUserId.value != null ? String(myUserId.value) : ''
    const mutualIds = [...new Set(
      (followStore.followersList || [])
        .map(x => String(x))
        .filter(id => id !== mine && following.has(id)),
    )]
    const activeIds = new Set(
      (c.participants || [])
        .filter(p => p && !p.leftAt)
        .map(p => String(p.userId)),
    )
    const candidateIds = mutualIds.filter(id => !activeIds.has(id))
    const rows = await Promise.all(
      candidateIds.map(async (id) => {
        const mini = await getChatUserDisplay(id)
        return {
          id: String(id),
          name: mini.name,
          username: mini.username,
          avatarUrl: mini.avatarUrl,
        }
      }),
    )
    rows.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
    addMemberCandidates.value = rows
  }
  finally {
    addMembersListLoading.value = false
  }
}

const fallbackTint = ['bg-[#1877f2]', 'bg-[#166fe5]', 'bg-[#1464d4]']

function fallbackClass(id) {
  const s = String(id)
  let n = 0
  for (let i = 0; i < s.length; i++) {
    n += s.charCodeAt(i)
  }
  return fallbackTint[n % fallbackTint.length]
}

function onConversationDissolved(payload) {
  const cid = payload?.conversationId != null ? String(payload.conversationId) : ''
  if (!cid) {
    return
  }
  conversations.value = conversations.value.filter(c => c.id !== cid)
  if (String(selectedId.value) === cid) {
    selectedId.value = null
    mobileShowThread.value = false
  }
  scheduleRefreshFolderUnreadTotals()
}

function confirmTitleHtml(text) {
  return new Promise((resolve) => {
    Modal.confirm({
      title: text,
      okText: 'Xác nhận',
      cancelText: 'Hủy',
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}

async function onRemoveGroupMember(userId) {
  const cid = active.value?.id
  const uid = userId != null ? String(userId).trim() : ''
  if (!cid || !uid || !active.value?.isGroup) {
    return
  }
  const ok = await confirmTitleHtml(
    'Xóa thành viên khỏi nhóm? Họ chỉ xem được tin tới thời điểm này và không thấy tin nhắn sau đó, trừ khi được mời lại.',
  )
  if (!ok) {
    return
  }
  try {
    await chatApi.removeGroupMember(cid, uid)
    notification.success({ message: 'Đã xóa thành viên' })
    await handleGroupConversationRefresh(cid)
    await loadConversationList()
  }
  catch (e) {
    console.error('removeGroupMember', e)
    notification.error({
      message: 'Xóa thành viên',
      description: e?.response?.data?.message || 'Không thực hiện được.',
    })
  }
}

async function onLeaveGroupClick() {
  const cid = active.value?.id
  if (!cid || !active.value?.isGroup) {
    return false
  }
  const ok = await confirmTitleHtml('Rời nhóm? Bạn vẫn xem được tin nhắn cũ.')
  if (!ok) {
    return false
  }
  try {
    await chatApi.leaveGroup(cid)
    notification.success({ message: 'Đã rời nhóm' })
    await loadConversationList()
    if (String(selectedId.value) === String(cid)) {
      await refreshPinnedMessages(cid)
      await fetchMessagingEligibility(cid)
    }
    return true
  }
  catch (e) {
    console.error('leaveGroup', e)
    notification.error({
      message: 'Rời nhóm',
      description: e?.response?.data?.message || 'Không thực hiện được.',
    })
    return false
  }
}

async function onDissolveGroupClick() {
  const cid = active.value?.id
  if (!cid || !active.value?.isGroup) {
    return false
  }
  const ok = await confirmTitleHtml(
    'Giải tán nhóm? Toàn bộ tin nhắn sẽ bị xóa vĩnh viễn.',
  )
  if (!ok) {
    return false
  }
  try {
    await chatApi.dissolveGroup(cid)
    notification.success({ message: 'Đã giải tán nhóm' })
    onConversationDissolved({ conversationId: cid })
    return true
  }
  catch (e) {
    console.error('dissolveGroup', e)
    notification.error({
      message: 'Giải tán nhóm',
      description: e?.response?.data?.message || 'Không thực hiện được.',
    })
    return false
  }
}

async function handleGroupConversationRefresh(conversationId) {
  const id = conversationId != null ? String(conversationId) : ''
  if (!id) {
    return
  }
  await refreshPinnedMessages(id)
  if (String(selectedId.value) === id) {
    await fetchMessagingEligibility(id)
    if (groupDetailsOpen.value && active.value?.isGroup) {
      await Promise.all([
        hydrateGroupDetailMemberRows(),
        buildAddMemberCandidateList(),
      ])
    }
  }
  scheduleRefreshFolderUnreadTotals()
}

function onGroupSocketUpdated(payload) {
  void handleGroupConversationRefresh(payload?.conversationId)
}

function onGroupSocketAdminTransferred(payload) {
  void handleGroupConversationRefresh(payload?.conversationId)
}

function onGroupSocketMemberLeft(payload) {
  void handleGroupConversationRefresh(payload?.conversationId)
}

function onGroupToolUpdated(payload) {
  const type = payload?.toolType ? String(payload.toolType) : ''
  const tool = payload?.tool
  if (type && tool?.id) {
    rememberGroupTool(type, tool)
  }
}

function onGroupReminderFired(payload) {
  const reminder = payload?.reminder
  if (reminder?.id) {
    rememberGroupTool('reminder', reminder)
  }
  if (payload?.conversationId && String(payload.conversationId) === String(selectedId.value || '')) {
    notification.info({
      message: 'Nhắc hẹn nhóm',
      description: reminder?.title || 'Đến giờ nhắc hẹn.',
    })
  }
}

async function onDrawerSaveGroupName(name) {
  const cid = active.value?.id
  const n = typeof name === 'string' ? name.trim() : ''
  if (!cid || !n || !active.value?.isGroup) {
    return
  }
  try {
    await chatApi.patchGroup(cid, { groupName: n })
    const c = active.value
    c.groupName = n
    c.name = n
    await refreshPinnedMessages(cid)
    await loadConversationList()
    notification.success({ message: 'Đã cập nhật tên nhóm' })
  }
  catch (e) {
    console.error('patchGroup name', e)
    notification.error({
      message: 'Tên nhóm',
      description: e?.response?.data?.message || 'Không lưu được.',
    })
  }
}

async function onDrawerGroupAvatarPicked(file) {
  const cid = active.value?.id
  if (!cid || !active.value?.isGroup || !(file instanceof File)) {
    return
  }
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.type)) {
    notification.error({
      message: 'Ảnh nhóm',
      description: 'Chọn JPEG, PNG, GIF hoặc WebP.',
    })
    return
  }
  try {
    const res = await chatApi.presignChatImageUpload(cid, {
      contentType: file.type,
      fileName: file.name,
    })
    const presign = unwrapChatData(res)
    const put = await fetch(presign.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    })
    if (!put.ok) {
      throw new Error(`Upload ${put.status}`)
    }
    await chatApi.patchGroup(cid, { groupAvatarObjectKey: presign.objectKey })
    await refreshPinnedMessages(cid)
    await loadConversationList()
    notification.success({ message: 'Đã cập nhật ảnh nhóm' })
  }
  catch (e) {
    console.error('group avatar', e)
    notification.error({
      message: 'Ảnh nhóm',
      description: e?.response?.data?.message || e?.message || 'Không tải được ảnh.',
    })
  }
}

async function onDrawerAddGroupMembers(userIds) {
  const cid = active.value?.id
  if (!cid || !Array.isArray(userIds) || !userIds.length) {
    return
  }
  addMembersSubmitLoading.value = true
  try {
    await chatApi.addGroupMembers(cid, userIds)
    notification.success({ message: 'Đã thêm thành viên' })
    groupDrawerRef.value?.closeAddMembersModal?.()
    await refreshPinnedMessages(cid)
    await loadConversationList()
    await Promise.all([
      hydrateGroupDetailMemberRows(),
      buildAddMemberCandidateList(),
    ])
  }
  catch (e) {
    console.error('addGroupMembers', e)
    notification.error({
      message: 'Thêm thành viên',
      description: e?.response?.data?.message || 'Không thêm được.',
    })
  }
  finally {
    addMembersSubmitLoading.value = false
  }
}

async function runTransferAdmin(newAdminUserId) {
  const cid = active.value?.id
  const tid = newAdminUserId != null ? String(newAdminUserId) : ''
  if (!cid || !tid) {
    notification.warning({ message: 'Chọn thành viên nhận quyền admin' })
    return
  }
  try {
    await chatApi.transferGroupAdmin(cid, tid)
    notification.success({ message: 'Đã chuyển quyền admin' })
    await loadConversationList()
    await refreshPinnedMessages(cid)
    await fetchMessagingEligibility(cid)
    await hydrateGroupDetailMemberRows()
    await buildAddMemberCandidateList()
  }
  catch (e) {
    console.error('transferAdmin', e)
    notification.error({
      message: 'Chuyển quyền',
      description: e?.response?.data?.message || 'Không thực hiện được.',
    })
  }
}

async function onLeaveGroupFromDrawer() {
  const done = await onLeaveGroupClick()
  if (done) {
    groupDetailsOpen.value = false
  }
}

async function onDissolveGroupFromDrawer() {
  const done = await onDissolveGroupClick()
  if (done) {
    groupDetailsOpen.value = false
  }
}

watch(groupDetailsOpen, (open) => {
  if (open && active.value?.isGroup) {
    void Promise.all([
      hydrateGroupDetailMemberRows(),
      buildAddMemberCandidateList(),
      mediaPanelLoaded.value ? Promise.resolve() : fetchConversationMedia({ append: false }),
      filePanelLoaded.value ? Promise.resolve() : fetchConversationFiles({ append: false }),
      linkPanelLoaded.value ? Promise.resolve() : fetchConversationLinks({ append: false }),
    ])
  }
})

watch(directDetailsOpen, (open) => {
  if (open && active.value && !active.value.isGroup) {
    void Promise.all([
      mediaPanelLoaded.value ? Promise.resolve() : fetchConversationMedia({ append: false }),
      filePanelLoaded.value ? Promise.resolve() : fetchConversationFiles({ append: false }),
      linkPanelLoaded.value ? Promise.resolve() : fetchConversationLinks({ append: false }),
    ])
  }
})

let socketConnectJoin = () => {}

watch(selectedId, async (id, oldId) => {
  groupDetailsOpen.value = false
  directDetailsOpen.value = false
  storageDrawerOpen.value = false
  groupSenderDisplayByUserId.value = {}
  receiptDetailForMessageId.value = null
  messageActionMenuId.value = null
  messageActionHoverId.value = null
  clearMessageActionHideTimer()
  clearReplyToMessage()
  clearPendingChatImage()
  clearPendingChatFile()
  clearReadDebounceTimer()

  if (oldId != null && String(oldId) !== String(id ?? '')) {
    stopTypingNow()
    const prev = conversations.value.find(c => c.id === String(oldId))
    if (prev?.messages?.length) {
      const last = prev.messages[prev.messages.length - 1]
      await markConversationReadUpTo(prev.id, last.id)
    }
  }

  scrollMessagesToBottom()
  if (id) {
    await Promise.all([
      loadMessagesForConversation(String(id)),
      refreshPinnedMessages(String(id)),
      fetchMessagingEligibility(String(id)),
    ])
    emitRoomJoin(id)
    await nextTick()
    scrollMessagesToBottom()
    const c = active.value
    if (c?.messages?.length) {
      const last = c.messages[c.messages.length - 1]
      await markConversationReadUpTo(c.id, last.id)
    }
  } else {
    messagingEligibility.value = {
      allowed: true,
      reason: null,
      scope: 'not_direct',
    }
  }
  await nextTick()
  updateJumpToLatestVisibility()
})

watch(
  () => active.value?.messages?.length,
  async () => {
    await nextTick()
    updateJumpToLatestVisibility()
  },
)

watch(
  () => incomingCall.value?.peerUserId,
  (peerUserId) => {
    if (!peerUserId) {
      incomingCallerProfile.value = null
      return
    }
    void fetchIncomingCallerProfile(peerUserId)
  },
  { immediate: true },
)

function resolveSocketConnectJoin() {
  if (selectedId.value) {
    emitRoomJoin(selectedId.value)
    nextTick(() => {
      const cid = selectedId.value
      if (cid) {
        scheduleMarkReadForOpenConversation(String(cid))
      }
    })
  }
}

function onConversationAdded(payload) {
  const raw = payload?.conversation
  if (!raw?.id) {
    return
  }
  mergeConversationFromRealtime(raw)
}

onMounted(async () => {
  mountNotifyUnlock()
  await userStore.fetchUserData()
  await fetchPresenceSettings()
  await loadConversationList()
  connectChatSocket()
  startPresenceHeartbeat()
  const s = getChatSocket()
  if (s) {
    s.on('message:new', onMessageNew)
    s.on('message:updated', onMessageUpdated)
    s.on('conversation:read', onConversationRead)
    s.on('conversation:pins-updated', onConversationPinsUpdated)
    s.on('conversation:dissolved', onConversationDissolved)
    s.on('conversation:added', onConversationAdded)
    s.on('group:updated', onGroupSocketUpdated)
    s.on('group:admin-transferred', onGroupSocketAdminTransferred)
    s.on('group:member-left', onGroupSocketMemberLeft)
    s.on('group-tool:updated', onGroupToolUpdated)
    s.on('group-reminder:fired', onGroupReminderFired)
    s.on('presence:update', onPresenceUpdate)
    socketConnectJoin = resolveSocketConnectJoin
    s.on('connect', socketConnectJoin)
  }
  if (selectedId.value) {
    emitRoomJoin(selectedId.value)
  }
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollMessagesToBottom())
  })
  loadStickerPack(stickerPackActive.value)
})

onUnmounted(() => {
  stopTypingNow()
  unmountNotifyUnlock()
  clearMessageActionHideTimer()
  clearThreadSearchDebounce()
  clearPendingChatImage()
  clearPendingChatFile()
  clearFolderUnreadDebounce()
  clearReadDebounceTimer()
  stopPresenceHeartbeat()
  const s = getChatSocket()
  if (s) {
    s.off('message:new', onMessageNew)
    s.off('message:updated', onMessageUpdated)
    s.off('conversation:read', onConversationRead)
    s.off('conversation:pins-updated', onConversationPinsUpdated)
    s.off('conversation:dissolved', onConversationDissolved)
    s.off('conversation:added', onConversationAdded)
    s.off('group:updated', onGroupSocketUpdated)
    s.off('group:admin-transferred', onGroupSocketAdminTransferred)
    s.off('group:member-left', onGroupSocketMemberLeft)
    s.off('group-tool:updated', onGroupToolUpdated)
    s.off('group-reminder:fired', onGroupReminderFired)
    s.off('presence:update', onPresenceUpdate)
    s.off('connect', socketConnectJoin)
  }
  disconnectChatSocket()
})
</script>

<template>
  <div
    class="chat-page flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white font-sans text-[15px] leading-relaxed text-zinc-900 antialiased [-webkit-font-smoothing:antialiased]"
  >
    <audio
      ref="notifyAudioRef"
      preload="auto"
      playsinline
      class="pointer-events-none fixed left-0 top-0 h-px w-px opacity-0"
      :src="notifySoundSrc"
      aria-hidden="true"
    />
    <div
      v-if="showIncomingCallModal && incomingCall"
      class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-[28px] border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-white shadow-2xl">
        <p class="text-center text-[13px] uppercase tracking-[0.18em] text-zinc-400">
          Incoming {{ incomingCall.callType === 'video' ? 'video' : 'audio' }} call
        </p>
        <div class="mt-4 flex flex-col items-center">
          <img
            :src="incomingAvatarSrc()"
            alt=""
            class="h-24 w-24 rounded-full object-cover ring-2 ring-white/30"
            loading="lazy"
            decoding="async"
            @error="markAvatarBroken(incomingCall.conversationId || incomingCall.peerUserId || 'incoming')"
          >
          <p class="mt-4 text-center text-[24px] font-semibold leading-tight">
            {{ callDisplayName }}
          </p>
          <p class="mt-1 text-center text-[13px] text-zinc-400">
            {{ incomingCall.callType === 'video' ? 'Video call' : 'Audio call' }}
          </p>
          <p class="mt-1 text-center text-[12px] font-medium text-amber-300">
            Auto missed in {{ incomingRingCountdownLabel }}
          </p>
        </div>
        <div class="mt-8 flex items-center justify-center gap-8">
          <button
            type="button"
            class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-xl text-white shadow-lg transition hover:scale-105 hover:bg-rose-600"
            aria-label="Decline call"
            @click="rejectIncomingCall()"
          >
            <i class="fa-solid fa-phone-slash" />
          </button>
          <button
            type="button"
            class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-xl text-white shadow-lg transition hover:scale-105 hover:bg-emerald-600"
            aria-label="Accept call"
            @click="acceptIncomingCall()"
          >
            <i class="fa-solid fa-phone" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showIncomingGroupCall && incomingGroupCall"
      class="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 px-4 backdrop-blur-sm"
    >
      <div class="w-full max-w-md rounded-[28px] border border-white/15 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 text-white shadow-2xl">
        <p class="text-center text-[13px] uppercase tracking-[0.18em] text-zinc-400">
          Cuộc gọi {{ incomingGroupCall.callType === 'audio' ? 'thoại' : 'video' }} nhóm
        </p>
        <div class="mt-5 flex flex-col items-center text-center">
          <div class="flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-[30px]">
            <i :class="incomingGroupCall.callType === 'audio' ? 'fa-solid fa-phone' : 'fa-solid fa-video'" />
          </div>
          <p class="mt-4 text-[24px] font-semibold leading-tight">
            {{ incomingGroupConversation?.name || active?.name || 'Nhóm chat' }}
          </p>
          <p class="mt-1 text-[13px] text-zinc-400">
            Một thành viên đang bắt đầu cuộc gọi nhóm.
          </p>
        </div>
        <div class="mt-8 flex items-center justify-center gap-8">
          <button
            type="button"
            class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-xl text-white shadow-lg transition hover:scale-105 hover:bg-rose-600"
            aria-label="Bỏ qua cuộc gọi nhóm"
            @click="dismissIncomingGroupCall"
          >
            <i class="fa-solid fa-phone-slash" />
          </button>
          <button
            type="button"
            class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-xl text-white shadow-lg transition hover:scale-105 hover:bg-emerald-600"
            aria-label="Tham gia cuộc gọi nhóm"
            @click="joinGroupCall(incomingGroupCall)"
          >
            <i class="fa-solid fa-phone" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showCallStage"
      class="fixed inset-0 z-40 bg-zinc-950"
    >
      <audio
        ref="remoteAudioRef"
        autoplay
        playsinline
        class="pointer-events-none absolute h-0 w-0 opacity-0"
      />
      <video
        v-if="(currentCall?.callType || incomingCall?.callType) === 'video'"
        ref="remoteVideoRef"
        autoplay
        playsinline
        class="h-full w-full object-cover"
      />
      <div
        v-else
        class="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-zinc-900 to-zinc-950 text-white"
      >
        <div class="flex h-28 w-28 items-center justify-center rounded-full bg-white/10 text-4xl">
          <i class="fa-solid fa-user" />
        </div>
      </div>

      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />
      <div class="absolute left-0 right-0 top-0 p-5 text-center text-white">
        <p class="text-[24px] font-semibold leading-tight">
          {{ callDisplayName }}
        </p>
        <p class="mt-1 text-[13px] text-zinc-200/90">
          {{ (currentCall?.callType || incomingCall?.callType) === 'video' ? 'Video call' : 'Audio call' }}
          · {{ callState }} · {{ connectionState }}
          <span v-if="isInCall"> · {{ callDurationLabel }}</span>
        </p>
      </div>

      <div
        class="absolute right-4 top-24 overflow-hidden rounded-2xl border border-white/25 bg-black/45 shadow-xl"
        :class="(currentCall?.callType || incomingCall?.callType) === 'video' ? 'h-40 w-28 sm:h-52 sm:w-36' : 'h-28 w-20 sm:h-36 sm:w-24'"
      >
        <video
          ref="localVideoRef"
          autoplay
          muted
          playsinline
          class="h-full w-full object-cover"
        />
      </div>

      <div class="absolute bottom-7 left-0 right-0 flex items-center justify-center gap-4 px-4">
        <button
          type="button"
          class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl text-white backdrop-blur transition hover:bg-white/30"
          :aria-label="isMuted ? 'Unmute' : 'Mute'"
          @click="toggleMute"
        >
          <i :class="isMuted ? 'fa-solid fa-microphone-slash' : 'fa-solid fa-microphone'" />
        </button>
        <button
          type="button"
          class="inline-flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-xl text-white backdrop-blur transition hover:bg-white/30"
          :aria-label="isCameraOn ? 'Turn camera off' : 'Turn camera on'"
          @click="toggleCamera"
        >
          <i :class="isCameraOn ? 'fa-solid fa-video' : 'fa-solid fa-video-slash'" />
        </button>
        <button
          type="button"
          class="inline-flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-xl text-white shadow-lg transition hover:bg-rose-600"
          @click="endCall"
        >
          <i class="fa-solid fa-phone-slash" />
        </button>
      </div>
    </div>

    <ChatGroupCallStage
      v-if="isGroupCalling"
      :session="groupCallSession"
      :state="groupCallState"
      :tiles="groupCallTiles"
      :duration-label="groupCallDurationLabel"
      :mic-enabled="groupCallMicEnabled"
      :camera-enabled="groupCallCameraEnabled"
      @toggle-mic="toggleGroupCallMic"
      @toggle-camera="toggleGroupCallCamera"
      @leave="leaveGroupCall"
      @end="leaveGroupCall"
    />

    <div class="flex h-full min-h-0 w-full flex-1 flex-col">
      <div
        class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white md:flex-row"
      >
        <ChatConversationSidebar
          v-model:query="query"
          :mobile-show-thread="mobileShowThread"
          :list-folder="listFolder"
          :inbox-unread-total="inboxUnreadTotal"
          :pending-unread-total="pendingUnreadTotal"
          :list-loading="listLoading"
          :conversations="filtered"
          :has-any-conversations="conversations.length > 0"
          :selected-id="selectedId"
          :default-avatar-url="defaultAvatarUrl"
          :time-label="timeLabel"
          :initials="initials"
          :fallback-class="fallbackClass"
          :is-avatar-broken="isAvatarBroken"
          @set-folder="setListFolder"
          @select="selectConversation"
          @open-profile="openPeerProfile"
          @avatar-error="markAvatarBroken"
          @new-group="openCreateGroupModal"
          @open-account-settings="openAccountSettings"
        />

        <section
          class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f0f2f5]"
          :class="[!mobileShowThread ? 'hidden md:flex' : 'flex']"
        >
          <template v-if="active">
            <div
              class="flex h-full min-h-0 flex-1 flex-col overflow-hidden"
            >
              <div class="border-b border-zinc-200 bg-white">
                <div class="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 md:hidden"
                    aria-label="Back"
                    @click="backToList"
                  >
                    <i class="fa-solid fa-chevron-left text-[15px]" />
                  </button>
                  <div
                    class="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl py-0.5 pr-1 transition hover:bg-zinc-50/80"
                    role="button"
                    tabindex="0"
                    :aria-label="active.isGroup ? 'Thông tin nhóm' : 'Xem hồ sơ'"
                    @click.stop.prevent="onChatHeaderIdentityClick"
                    @keydown.enter.stop.prevent="onChatHeaderIdentityClick"
                  >
                    <div class="relative h-12 w-12 shrink-0">
                      <img
                        v-if="!isAvatarBroken(active.id)"
                        :src="active.peerAvatarUrl || defaultAvatarUrl"
                        alt=""
                        width="48"
                        height="48"
                        class="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-200/80"
                        loading="eager"
                        decoding="async"
                        fetchpriority="high"
                        @error="markAvatarBroken(active.id)"
                      >
                      <div
                        v-else
                        class="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ring-1 ring-zinc-200/80"
                        :class="fallbackClass(active.id)"
                      >
                        {{ initials(active.name) }}
                      </div>
                    </div>
                    <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <p class="truncate text-[17px] font-semibold leading-tight text-zinc-900">
                        {{ active.name }}
                      </p>
                      <p
                        v-if="active.isGroup"
                        class="truncate text-[13px] leading-tight text-zinc-500"
                      >
                        Nhóm chat
                        <template v-if="String(active.adminUserId) === String(myUserId)">
                          · Bạn là quản trị viên
                        </template>
                      </p>
                      <p
                        v-else-if="active.online"
                        class="text-[13px] font-normal leading-tight text-[#1877f2]"
                      >
                        <span aria-hidden="true">• </span>Active now
                      </p>
                      <p
                        v-else-if="peerLastSeenSubtitle(active)"
                        class="truncate text-[13px] leading-tight text-zinc-500"
                      >
                        {{ peerLastSeenSubtitle(active) }}
                      </p>
                      <p
                        v-else
                        class="truncate text-[13px] leading-tight text-zinc-500"
                      >
                        @{{ active.username }}
                      </p>
                    </div>
                  </div>
                  <div class="ml-auto flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-[#1877f2]"
                      aria-label="Audio call"
                      :disabled="isCalling || isGroupCalling || !messagingAllowed"
                      @click="startAudioCall"
                    >
                      <i class="fa-solid fa-phone text-[14px]" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-[#1877f2]"
                      aria-label="Video call"
                      :disabled="isCalling || isGroupCalling || !messagingAllowed"
                      @click="startVideoCall"
                    >
                      <i class="fa-solid fa-video text-[14px]" />
                    </button>
                    <a-dropdown trigger="click">
                      <button
                        type="button"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-[#1877f2]"
                        :class="active.notificationMuted ? 'bg-amber-100 text-amber-700 hover:bg-amber-100 hover:text-amber-800' : ''"
                        aria-label="More conversation actions"
                        @click.prevent
                      >
                        <i class="fa-solid fa-ellipsis text-[14px]" />
                      </button>
                      <template #overlay>
                        <a-menu>
                          <a-menu-item key="search" @click="toggleThreadSearchPanel">
                            <span class="flex items-center gap-2">
                              <i class="fa-solid fa-magnifying-glass w-4 text-[12px]" />
                              <span>{{ threadSearchOpen ? 'Đóng tìm kiếm' : 'Tìm trong hội thoại' }}</span>
                            </span>
                          </a-menu-item>
                          <a-menu-item
                            v-if="active.notificationMuted"
                            key="off"
                            @click="setConversationNotificationMute('off')"
                          >
                            <span class="flex items-center gap-2">
                              <i class="fa-regular fa-bell w-4 text-[12px]" />
                              <span>Bật thông báo lại</span>
                            </span>
                          </a-menu-item>
                          <a-sub-menu key="mute">
                            <template #title>
                              <span class="flex items-center gap-2">
                                <i
                                  class="w-4 text-[12px]"
                                  :class="active.notificationMuted ? 'fa-solid fa-bell-slash' : 'fa-regular fa-bell'"
                                />
                                <span>Tắt thông báo</span>
                              </span>
                            </template>
                            <a-menu-item key="1h" @click="setConversationNotificationMute('1h')">
                              1 giờ
                            </a-menu-item>
                            <a-menu-item key="8h" @click="setConversationNotificationMute('8h')">
                              8 giờ
                            </a-menu-item>
                            <a-menu-item key="24h" @click="setConversationNotificationMute('24h')">
                              24 giờ
                            </a-menu-item>
                            <a-menu-item key="forever" @click="setConversationNotificationMute('forever')">
                              Đến khi bật lại
                            </a-menu-item>
                          </a-sub-menu>
                        </a-menu>
                      </template>
                    </a-dropdown>
                  </div>
                </div>
              </div>

              <ChatThreadSearchPanel
                v-if="threadSearchOpen && active"
                v-model="threadSearchDraft"
                :results="threadSearchResults"
                :loading="threadSearchLoading"
                :has-more="threadSearchHasMore"
                :peer-display-name="active?.name || 'User'"
                :format-time="timeLabel"
                @pick="onThreadSearchResultClick"
                @load-more="loadMoreThreadSearch"
              />

              <ChatPinnedMessagesSection
                v-if="active.pinnedMessages?.length"
                :key="active.id"
                :pinned-messages="active.pinnedMessages"
                :banner-preview="pinnedBannerPreview"
                @banner-click="onPinnedBannerClick"
                @unpin-all="unpinAllPinned"
                @unpin="unpinPinnedEntry"
              />

              <ChatMessageList
                ref="messageListRef"
                :rows="activeMessageRows"
                :peer="active"
                :highlighted-message-id="highlightedMessageId"
                :messages-loading="messagesLoading"
                :loading-older-messages="loadingOlderMessages"
                :show-jump-to-latest="showJumpToLatest"
                :default-avatar-url="defaultAvatarUrl"
                :api="messageListApi"
                @scroll="onMessagesScrollWithJump"
                @jump-to-latest="jumpToLatestMessage"
              />

              <ChatComposer
                v-model:draft="draft"
                :messaging-gate-banner-text="messagingGateBannerText"
                :peer-typing="peerTyping"
                :peer-name="active.name"
                :sticker-picker-open="stickerPickerOpen"
                :sticker-pack-active="stickerPackActive"
                :sticker-rows="stickerRows"
                :pending-chat-image="pendingChatImage"
                :pending-chat-file="pendingChatFile"
                :reply-to="replyTo"
                :messaging-allowed="messagingAllowed"
                :send-pending="sendPending"
                :is-group="active.isGroup"
                @submit="sendMessage"
                @composer-input="onComposerInput"
                @composer-blur="stopTypingNow"
                @composer-keydown="onComposerKeydown"
                @toggle-sticker-picker="toggleStickerPicker"
                @select-sticker-pack="selectStickerPack"
                @send-sticker="sendStickerMessage"
                @sticker-image-error="onStickerImageError"
                @clear-pending-image="clearPendingChatImage"
                @clear-pending-file="clearPendingChatFile"
                @clear-reply="clearReplyToMessage"
                @image-selected="onChatImageSelected"
                @file-selected="onChatFileSelected"
                @create-poll="openCreatePollModal"
                @create-reminder="openCreateReminderModal"
                @create-note="openCreateNoteModal"
              />
            </div>
          </template>

          <div
            v-else
            class="hidden flex-1 flex-col items-center justify-center gap-2 px-8 text-center md:flex"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-400">
              <i class="fa-regular fa-message text-xl" />
            </div>
            <p class="text-[15px] font-medium text-zinc-600">
              No conversation selected
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
  <a-modal
    v-model:open="createGroupOpen"
    title="Tạo nhóm chat"
    ok-text="Tạo nhóm"
    cancel-text="Hủy"
    :width="420"
    destroy-on-close
    @ok="submitCreateGroup"
  >
    <p class="mb-2 text-[13px] text-zinc-500">
      Danh sách bên dưới là những người <strong>bạn follow và họ cũng follow lại bạn</strong>.
      Chọn 2-9 người để tạo nhóm (tối đa 10 thành viên gồm cả bạn).
    </p>
    <label class="mb-3 block text-[13px] font-medium text-zinc-700">Tên nhóm</label>
    <a-input
      v-model:value="createGroupName"
      placeholder="Ví dụ: Team design"
      class="mb-4"
      max-length="120"
    />
    <p class="mb-2 text-[13px] font-medium text-zinc-700">
      Thành viên ({{ createGroupSelectedUserIds.length }}/{{ MAX_GROUP_INVITEES }} đã chọn)
    </p>
    <ul
      class="max-h-52 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100"
    >
      <li
        v-if="createGroupListLoading"
        class="px-3 py-8 text-center text-[13px] text-zinc-500"
      >
        Đang tải danh sách…
      </li>
      <template v-else>
        <li
          v-for="row in createGroupMutualRows"
          :key="row.id"
          class="flex items-center gap-3 px-3 py-2.5"
        >
          <input
            :id="`g-${row.id}`"
            type="checkbox"
            class="h-4 w-4 shrink-0 rounded border-zinc-300"
            :checked="createGroupSelectedUserIds.includes(row.id)"
            :disabled="!createGroupSelectedUserIds.includes(row.id) && createGroupSelectedUserIds.length >= MAX_GROUP_INVITEES"
            @change="toggleCreateGroupMember(row.id)"
          >
          <label
            :for="`g-${row.id}`"
            class="flex min-w-0 flex-1 cursor-pointer items-center gap-3"
          >
            <img
              v-if="row.avatarUrl"
              :src="row.avatarUrl"
              alt=""
              width="36"
              height="36"
              class="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-200/80"
              loading="lazy"
              decoding="async"
            >
            <div
              v-else
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white ring-1 ring-zinc-200/80"
              :class="fallbackClass(row.id)"
            >
              {{ initials(row.name) }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-[14px] font-semibold text-zinc-900">
                {{ row.name }}
              </p>
              <p
                v-if="row.username"
                class="truncate text-[12px] text-zinc-500"
              >
                @{{ row.username }}
              </p>
            </div>
          </label>
        </li>
        <li
          v-if="createGroupMutualRows.length === 0"
          class="px-3 py-6 text-center text-[13px] text-zinc-500"
        >
          Chưa có ai follow lẫn nhau với bạn. Hãy follow và được follow lại để tạo nhóm.
        </li>
      </template>
    </ul>
  </a-modal>
  <a-modal
    v-model:open="createPollOpen"
    title="Tạo bình chọn"
    ok-text="Tạo"
    cancel-text="Hủy"
    :confirm-loading="createPollSubmitting"
    :width="460"
    destroy-on-close
    @ok="submitCreatePoll"
  >
    <label class="mb-1 block text-[13px] font-medium text-zinc-700">Chủ đề bình chọn</label>
    <a-input
      v-model:value="pollQuestion"
      placeholder="Ví dụ: Tối nay ăn gì?"
      max-length="240"
      class="mb-3"
    />
    <div class="mb-2 flex items-center justify-between">
      <span class="text-[13px] font-medium text-zinc-700">Lựa chọn</span>
      <button
        type="button"
        class="text-[13px] font-semibold text-[#1877f2]"
        @click="addPollOptionInput"
      >
        Thêm lựa chọn
      </button>
    </div>
    <div class="space-y-2">
      <div
        v-for="(_, index) in pollOptions"
        :key="index"
        class="flex items-center gap-2"
      >
        <a-input
          v-model:value="pollOptions[index]"
          :placeholder="`Lựa chọn ${index + 1}`"
          max-length="240"
        />
        <button
          type="button"
          class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-40"
          :disabled="pollOptions.length <= 2"
          aria-label="Xóa lựa chọn"
          @click="removePollOptionInput(index)"
        >
          <i class="fa-solid fa-xmark text-[12px]" />
        </button>
      </div>
    </div>
    <label class="mb-1 mt-4 block text-[13px] font-medium text-zinc-700">Deadline</label>
    <input
      v-model="pollDeadline"
      type="datetime-local"
      class="h-9 w-full rounded-md border border-zinc-300 px-3 text-[14px] outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/15"
    >
    <label class="mt-3 flex items-center gap-2 text-[13px] text-zinc-700">
      <input v-model="pollAllowMultiple" type="checkbox" class="h-4 w-4 rounded border-zinc-300">
      Cho chọn nhiều đáp án
    </label>
    <label class="mt-2 flex items-center gap-2 text-[13px] text-zinc-700">
      <input v-model="pollAllowAddOptions" type="checkbox" class="h-4 w-4 rounded border-zinc-300">
      Thành viên được thêm lựa chọn
    </label>
  </a-modal>
  <a-modal
    v-model:open="createReminderOpen"
    title="Tạo nhắc hẹn"
    ok-text="Tạo"
    cancel-text="Hủy"
    :confirm-loading="createReminderSubmitting"
    :width="460"
    destroy-on-close
    @ok="submitCreateReminder"
  >
    <label class="mb-1 block text-[13px] font-medium text-zinc-700">Tiêu đề</label>
    <a-input
      v-model:value="reminderTitle"
      placeholder="Ví dụ: Họp nhóm"
      max-length="180"
      class="mb-3"
    />
    <label class="mb-1 block text-[13px] font-medium text-zinc-700">Mô tả</label>
    <a-textarea
      v-model:value="reminderDescription"
      :rows="3"
      placeholder="Nội dung nhắc hẹn"
      max-length="2000"
      class="mb-3"
    />
    <label class="mb-1 block text-[13px] font-medium text-zinc-700">Thời gian nhắc</label>
    <input
      v-model="reminderAt"
      type="datetime-local"
      class="mb-3 h-9 w-full rounded-md border border-zinc-300 px-3 text-[14px] outline-none transition focus:border-[#1877f2] focus:ring-2 focus:ring-[#1877f2]/15"
    >
    <div class="mb-2 text-[13px] font-medium text-zinc-700">
      Người được nhắc
    </div>
    <div class="mb-3 flex gap-2">
      <button
        type="button"
        class="rounded-full px-3 py-1.5 text-[13px] font-semibold transition"
        :class="reminderTarget === 'all' ? 'bg-[#1877f2] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'"
        @click="reminderTarget = 'all'"
      >
        Tất cả
      </button>
      <button
        type="button"
        class="rounded-full px-3 py-1.5 text-[13px] font-semibold transition"
        :class="reminderTarget === 'members' ? 'bg-[#1877f2] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'"
        @click="reminderTarget = 'members'"
      >
        Chọn thành viên
      </button>
    </div>
    <div
      v-if="reminderTarget === 'members'"
      class="max-h-44 overflow-y-auto rounded-lg border border-zinc-200 divide-y divide-zinc-100"
    >
      <label
        v-for="row in reminderMemberRows"
        :key="row.id"
        class="flex cursor-pointer items-center gap-3 px-3 py-2"
      >
        <input
          type="checkbox"
          class="h-4 w-4 rounded border-zinc-300"
          :checked="reminderTargetUserIds.includes(row.id)"
          @change="toggleReminderTargetUser(row.id)"
        >
        <img
          v-if="row.avatarUrl"
          :src="row.avatarUrl"
          alt=""
          class="h-7 w-7 rounded-full object-cover"
        >
        <span
          v-else
          class="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
          :class="fallbackClass(row.id)"
        >{{ initials(row.name) }}</span>
        <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-800">{{ row.name }}</span>
      </label>
    </div>
  </a-modal>
  <a-modal
    v-model:open="createNoteOpen"
    title="Tạo ghi chú nhóm"
    ok-text="Tạo"
    cancel-text="Hủy"
    :confirm-loading="createNoteSubmitting"
    :width="460"
    destroy-on-close
    @ok="submitCreateNote"
  >
    <label class="mb-1 block text-[13px] font-medium text-zinc-700">Tiêu đề</label>
    <a-input
      v-model:value="noteTitle"
      placeholder="Tiêu đề ghi chú"
      max-length="180"
      class="mb-3"
    />
    <label class="mb-1 block text-[13px] font-medium text-zinc-700">Nội dung</label>
    <a-textarea
      v-model:value="noteContent"
      :rows="5"
      placeholder="Nội dung ghi chú"
      max-length="10000"
    />
    <label class="mt-3 flex items-center gap-2 text-[13px] text-zinc-700">
      <input v-model="notePinned" type="checkbox" class="h-4 w-4 rounded border-zinc-300">
      Ghim ghi chú
    </label>
  </a-modal>
  <a-drawer
    v-model:open="accountSettingsOpen"
    title="Cài đặt tài khoản"
    placement="right"
    :width="380"
    :body-style="{ padding: '18px', background: '#f8fafc' }"
  >
    <div class="space-y-3">
      <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div class="flex items-center gap-3 bg-gradient-to-r from-[#1877f2]/10 via-white to-white p-3.5">
          <img
            :src="userStore.user?.avatarUrl || userStore.user?.avatar || defaultAvatarUrl"
            alt=""
            class="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow-sm"
          >
          <div class="min-w-0 flex-1">
            <p class="truncate text-[15px] font-bold leading-tight text-zinc-900">
              {{ userStore.user?.fullName || userStore.user?.name || userStore.user?.username || 'Tài khoản' }}
            </p>
            <p
              v-if="userStore.user?.username"
              class="mt-0.5 truncate text-[12px] text-zinc-500"
            >
              @{{ userStore.user.username }}
            </p>
          </div>
          <NuxtLink
            to="/account"
            class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#1877f2] shadow-sm ring-1 ring-zinc-200 transition hover:bg-[#1877f2] hover:text-white"
            title="Trang tài khoản"
            @click="accountSettingsOpen = false"
          >
            <i class="fa-solid fa-arrow-up-right-from-square text-[12px]" />
          </NuxtLink>
        </div>
      </div>

      <section class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div class="px-4 pb-2 pt-3">
          <p class="text-[12px] font-bold uppercase tracking-[0.08em] text-zinc-400">
            Quyền riêng tư
          </p>
        </div>
        <div class="divide-y divide-zinc-100">
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
              <i class="fa-solid fa-circle text-[9px]" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-zinc-900">Trạng thái hoạt động</p>
              <p class="mt-0.5 text-[12px] leading-5 text-zinc-500">Ẩn online/last seen với người khác.</p>
            </div>
            <a-switch
              :checked="activeStatusVisible"
              :loading="activeStatusLoading"
              @change="toggleActiveStatusVisible"
            />
          </div>
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
              <i class="fa-solid fa-volume-high text-[13px]" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-zinc-900">Âm thanh thông báo</p>
              <p class="mt-0.5 text-[12px] leading-5 text-zinc-500">Phát tiếng khi có tin mới.</p>
            </div>
            <a-switch
              :checked="notificationSoundEnabled"
              :loading="accountSettingSavingKey === 'notificationSoundEnabled'"
              @change="value => patchAccountSetting('notificationSoundEnabled', value)"
            />
          </div>
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-600">
              <i class="fa-regular fa-message text-[13px]" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-zinc-900">Preview tin nhắn</p>
              <p class="mt-0.5 text-[12px] leading-5 text-zinc-500">Hiện nội dung trong toast.</p>
            </div>
            <a-switch
              :checked="messagePreviewEnabled"
              :loading="accountSettingSavingKey === 'messagePreviewEnabled'"
              @change="value => patchAccountSetting('messagePreviewEnabled', value)"
            />
          </div>
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <i class="fa-regular fa-eye text-[13px]" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-zinc-900">Đã xem</p>
              <p class="mt-0.5 text-[12px] leading-5 text-zinc-500">Không gửi/không thấy khi tắt.</p>
            </div>
            <a-switch
              :checked="readReceiptsEnabled"
              :loading="accountSettingSavingKey === 'readReceiptsEnabled'"
              @change="value => patchAccountSetting('readReceiptsEnabled', value)"
            />
          </div>
          <div class="flex items-center gap-3 px-4 py-3">
            <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
              <i class="fa-solid fa-keyboard text-[13px]" />
            </span>
            <div class="min-w-0 flex-1">
              <p class="text-[13px] font-semibold text-zinc-900">Đang nhập</p>
              <p class="mt-0.5 text-[12px] leading-5 text-zinc-500">Ẩn “đang nhập” với người khác.</p>
            </div>
            <a-switch
              :checked="typingStatusVisible"
              :loading="accountSettingSavingKey === 'typingStatusVisible'"
              @change="value => patchAccountSetting('typingStatusVisible', value)"
            />
          </div>
        </div>
      </section>

      <section class="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div class="mb-3 flex items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2]/10 text-[#1877f2]">
            <i class="fa-solid fa-user-shield text-[13px]" />
          </span>
          <div class="min-w-0">
            <p class="text-[13px] font-semibold text-zinc-900">
              Ai có thể nhắn tin cho tôi
            </p>
            <p class="text-[12px] text-zinc-500">Áp dụng cho chat 1-1.</p>
          </div>
        </div>
        <a-select
          :value="messageRequestsFrom"
          class="w-full"
          :loading="accountSettingSavingKey === 'messageRequestsFrom'"
          @change="value => patchAccountSetting('messageRequestsFrom', value)"
        >
          <a-select-option value="everyone">Mọi người</a-select-option>
          <a-select-option value="mutual_follow">Mutual follow</a-select-option>
          <a-select-option value="following">Chỉ người tôi follow</a-select-option>
        </a-select>
      </section>

      <NuxtLink
        to="/account?tab=privacy"
        class="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm transition hover:border-[#1877f2]/35 hover:bg-zinc-50"
        @click="accountSettingsOpen = false"
      >
        <span class="flex items-center gap-3">
          <i class="fa-solid fa-ban text-[14px] text-zinc-500" />
          <span>
            <span class="block text-[13px] font-semibold">Danh sách đã chặn</span>
            <span class="block text-[12px] text-zinc-500">Quản lý tài khoản bạn đã block.</span>
          </span>
        </span>
        <i class="fa-solid fa-chevron-right text-[12px] text-zinc-400" />
      </NuxtLink>
    </div>
  </a-drawer>
  <ChatGroupDetailsDrawer
    v-if="active?.isGroup"
    ref="groupDrawerRef"
    v-model:open="groupDetailsOpen"
    :loading="groupDrawerContentLoading"
    :conversation="active"
    :member-rows="groupDetailMemberRows"
    :my-user-id="myUserId"
    :default-avatar-url="defaultAvatarUrl"
    :add-member-candidates="addMemberCandidates"
    :add-members-loading="addMembersSubmitLoading"
    :media-items="mediaPanelItems"
    :media-loading="mediaPanelLoading"
    :media-has-more="mediaPanelHasMore"
    :file-items="filePanelItems"
    :file-loading="filePanelLoading"
    :file-has-more="filePanelHasMore"
    :link-items="linkPanelItems"
    :link-loading="linkPanelLoading"
    :link-has-more="linkPanelHasMore"
    :format-time="timeLabel"
    @save-name="onDrawerSaveGroupName"
    @pick-avatar-file="onDrawerGroupAvatarPicked"
    @leave="onLeaveGroupFromDrawer"
    @dissolve="onDissolveGroupFromDrawer"
    @transfer="runTransferAdmin"
    @add-members="onDrawerAddGroupMembers"
    @remove-member="onRemoveGroupMember"
    @open-user="openUserProfileById"
    @pick-media="onGroupDrawerMediaPick"
    @pick-file="onGroupDrawerMediaPick"
    @pick-link="onGroupDrawerMediaPick"
    @load-more-media="fetchConversationMedia({ append: true })"
    @open-storage="openStorageDrawer"
    @clear-history="confirmClearConversationHistory"
  />
  <ChatDirectDetailsDrawer
    v-if="active && !active.isGroup"
    v-model:open="directDetailsOpen"
    :conversation="active"
    :default-avatar-url="defaultAvatarUrl"
    :media-items="mediaPanelItems"
    :media-loading="mediaPanelLoading"
    :media-has-more="mediaPanelHasMore"
    :file-items="filePanelItems"
    :file-loading="filePanelLoading"
    :file-has-more="filePanelHasMore"
    :link-items="linkPanelItems"
    :link-loading="linkPanelLoading"
    :link-has-more="linkPanelHasMore"
    :format-time="timeLabel"
    @open-profile="onDirectDrawerOpenProfile"
    @pick-media="onGroupDrawerMediaPick"
    @pick-file="onGroupDrawerMediaPick"
    @pick-link="onGroupDrawerMediaPick"
    @load-more-media="fetchConversationMedia({ append: true })"
    @open-storage="openStorageDrawer"
    @clear-history="confirmClearConversationHistory"
  />
  <ChatStorageDrawer
    v-if="active"
    v-model:open="storageDrawerOpen"
    v-model:active-tab="storageDrawerTab"
    :media-items="mediaPanelItems"
    :media-loading="mediaPanelLoading"
    :media-has-more="mediaPanelHasMore"
    :file-items="filePanelItems"
    :file-loading="filePanelLoading"
    :file-has-more="filePanelHasMore"
    :link-items="linkPanelItems"
    :link-loading="linkPanelLoading"
    :link-has-more="linkPanelHasMore"
    :format-time="timeLabel"
    :sender-label="storageSenderLabel"
    @pick-media="onGroupDrawerMediaPick"
    @pick-file="onGroupDrawerMediaPick"
    @pick-link="onGroupDrawerMediaPick"
    @load-more-media="fetchConversationMedia({ append: true })"
    @load-more-files="fetchConversationFiles({ append: true })"
    @load-more-links="fetchConversationLinks({ append: true })"
  />
</template>

<style scoped>
.chat-page {
  isolation: isolate;
}
</style>
