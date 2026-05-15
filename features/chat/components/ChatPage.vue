<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { Modal, notification } from 'ant-design-vue'
import { useChatMessageNotify } from '~/features/chat/composables/useChatMessageNotify.js'
import { useChatConversationList } from '~/features/chat/composables/useChatConversationList.js'
import { useChatCall } from '~/features/chat/composables/useChatCall.js'
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
  scheduleRefreshFolderUnreadTotals,
  clearFolderUnreadDebounce,
  mergeConversationFromRealtime,
} = conversationList

const myUserId = computed(() => userStore.user?.id ?? null)

const groupDetailsOpen = ref(false)
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

const notify = useChatMessageNotify(selectedId, mobileShowThread)
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
)

const {
  messagesLoading,
  loadingOlderMessages,
  sendPending,
  draft,
  replyTo,
  pendingChatImage,
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
  startReplyToMessage: startReplyToMessageInner,
  clearReplyToMessage,
  jumpToMessage,
  onChatImageSelected,
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
    await openPeerProfile(c)
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

const messageListRef = ref(null)
const groupDrawerRef = ref(null)

watchEffect(() => {
  const root = messageListRef.value?.scrollRoot
  messagesScrollEl.value = root ?? null
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
  groupSeenDisplay,
  incomingAvatarKey,
  groupMessageSender,
  openIncomingSenderProfile,
  groupEventLineText,
}))

function shouldShowOutgoingReceipt(messages, messageId, conv) {
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
  return outgoingMessageReceiptLabel(conv, messageId, myUserId.value)
}

function peerLastSeenSubtitle(conv) {
  if (!conv || conv.online) {
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
  startOutgoingCall(CALL_TYPE.AUDIO)
}

function startVideoCall() {
  if (!messagingAllowed.value) {
    return
  }
  startOutgoingCall(CALL_TYPE.VIDEO)
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
    ])
  }
})

let socketConnectJoin = () => {}

watch(selectedId, async (id, oldId) => {
  groupDetailsOpen.value = false
  groupSenderDisplayByUserId.value = {}
  receiptDetailForMessageId.value = null
  messageActionMenuId.value = null
  messageActionHoverId.value = null
  clearMessageActionHideTimer()
  clearReplyToMessage()
  clearPendingChatImage()
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
                  <div class="ml-auto flex flex-wrap items-center justify-end gap-2">
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-[#1877f2]"
                      :class="threadSearchOpen ? 'bg-[#1877f2]/12 text-[#1877f2]' : ''"
                      :aria-expanded="threadSearchOpen"
                      aria-label="Search in conversation"
                      @click="toggleThreadSearch"
                    >
                      <i class="fa-solid fa-magnifying-glass text-[15px]" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-[#1877f2]"
                      aria-label="Audio call"
                      :disabled="isCalling || !messagingAllowed || active.isGroup"
                      @click="startAudioCall"
                    >
                      <i class="fa-solid fa-phone text-[15px]" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-[#1877f2]"
                      aria-label="Video call"
                      :disabled="isCalling || !messagingAllowed || active.isGroup"
                      @click="startVideoCall"
                    >
                      <i class="fa-solid fa-video text-[15px]" />
                    </button>
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
                :reply-to="replyTo"
                :messaging-allowed="messagingAllowed"
                :send-pending="sendPending"
                @submit="sendMessage"
                @composer-input="onComposerInput"
                @composer-blur="stopTypingNow"
                @composer-keydown="onComposerKeydown"
                @toggle-sticker-picker="toggleStickerPicker"
                @select-sticker-pack="selectStickerPack"
                @send-sticker="sendStickerMessage"
                @sticker-image-error="onStickerImageError"
                @clear-pending-image="clearPendingChatImage"
                @clear-reply="clearReplyToMessage"
                @image-selected="onChatImageSelected"
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
    @save-name="onDrawerSaveGroupName"
    @pick-avatar-file="onDrawerGroupAvatarPicked"
    @leave="onLeaveGroupFromDrawer"
    @dissolve="onDissolveGroupFromDrawer"
    @transfer="runTransferAdmin"
    @add-members="onDrawerAddGroupMembers"
    @remove-member="onRemoveGroupMember"
    @open-user="openUserProfileById"
  />
</template>

<style scoped>
.chat-page {
  isolation: isolate;
}
</style>
