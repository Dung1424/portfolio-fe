<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue'
import { notification } from 'ant-design-vue'
import { useChatMessageNotify } from '~/features/chat/composables/useChatMessageNotify.js'
import { useChatConversationList } from '~/features/chat/composables/useChatConversationList.js'
import { useChatCall } from '~/features/chat/composables/useChatCall.js'
import { useChatMessaging } from '~/features/chat/composables/useChatMessaging.js'
import { useConversationTyping } from '~/features/chat/composables/useConversationTyping.ts'
import { useResolvePublicMediaUrl } from '~/composables/useMediaBase'
import { profileService } from '~/features/profile/services/profile.api.js'
import { useUserStore } from '~/stores/userStore.js'
import { outgoingMessageReceiptLabel } from '~/features/chat/utils/chatReceipts.js'
import { lastOwnUiMessageId } from '~/features/chat/utils/chatMappers.js'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import ChatThreadSearchPanel from '~/features/chat/components/ChatThreadSearchPanel.vue'
import ChatConversationSidebar from '~/features/chat/components/ChatConversationSidebar.vue'
import ChatPinnedMessagesSection from '~/features/chat/components/ChatPinnedMessagesSection.vue'
import ChatMessageList from '~/features/chat/components/ChatMessageList.vue'
import ChatComposer from '~/features/chat/components/ChatComposer.vue'
import { useChatThreadSearch } from '~/features/chat/composables/useChatThreadSearch.js'
import { useChatStickerPicker } from '~/features/chat/composables/useChatStickerPicker.js'
import {
  isCallLogMessage,
  callLogIcon,
  callLogTitle,
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
const { resolveMediaUrl } = useResolvePublicMediaUrl()
const incomingProfileCache = new Map()

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
} = conversationList

const myUserId = computed(() => userStore.user?.id ?? null)

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

const messagingAllowed = computed(
  () => messagingEligibility.value.allowed !== false,
)

const messagingGateBannerText = computed(() => {
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
  return msg?.type === 'system' || isCallLogMessage(msg)
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
  if (!list?.length) {
    return []
  }
  return list.map((msg, i) => {
    const prev = list[i - 1]
    const next = list[i + 1]
    const sameRunPrev = prev && Boolean(prev.me) === Boolean(msg.me)
    const sameRunNext = next && Boolean(next.me) === Boolean(msg.me)
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

watchEffect(() => {
  const root = messageListRef.value?.scrollRoot
  messagesScrollEl.value = root ?? null
})

const messageListApi = computed(() => ({
  timeLabel,
  isSystemMessage,
  isCallLogMessage,
  callLogIcon,
  callLogTitle,
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
}))

function shouldShowOutgoingReceipt(messages, messageId, conv) {
  if (messageId == null || !conv) {
    return false
  }
  const label = outgoingMessageReceiptLabel(conv, messageId, myUserId.value)
  if (!label) {
    return false
  }
  const mid = String(messageId)
  const lastOwn = lastOwnUiMessageId(messages)
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

const fallbackTint = ['bg-[#1877f2]', 'bg-[#166fe5]', 'bg-[#1464d4]']

function fallbackClass(id) {
  const s = String(id)
  let n = 0
  for (let i = 0; i < s.length; i++) {
    n += s.charCodeAt(i)
  }
  return fallbackTint[n % fallbackTint.length]
}

let socketConnectJoin = () => {}

watch(selectedId, async (id, oldId) => {
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
    s.on('presence:update', onPresenceUpdate)
    socketConnectJoin = () => {
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
                    class="relative h-12 w-12 shrink-0 cursor-pointer"
                    role="button"
                    tabindex="0"
                    aria-label="Open profile"
                    @click.stop.prevent="openPeerProfile(active)"
                    @keydown.enter.stop.prevent="openPeerProfile(active)"
                  >
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
                      v-if="active.online"
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
                    <p v-else class="truncate text-[13px] leading-tight text-zinc-500">
                      @{{ active.username }}
                    </p>
                  </div>
                  <div class="ml-auto flex items-center gap-2">
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
                      :disabled="isCalling || !messagingAllowed"
                      @click="startAudioCall"
                    >
                      <i class="fa-solid fa-phone text-[15px]" />
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200 hover:text-[#1877f2]"
                      aria-label="Video call"
                      :disabled="isCalling || !messagingAllowed"
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
</template>

<style scoped>
.chat-page {
  isolation: isolate;
}
</style>
