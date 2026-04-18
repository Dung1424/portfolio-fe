<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { notification } from 'ant-design-vue'
import { useChatMessageNotify } from '~/composables/useChatMessageNotify.js'
import { useChatConversationList } from '~/composables/useChatConversationList.js'
import { useChatCall } from '~/composables/useChatCall.js'
import { useChatMessaging } from '~/composables/useChatMessaging.js'
import { useConversationTyping } from '~/composables/useConversationTyping.ts'
import { useResolvePublicMediaUrl } from '~/composables/useMediaBase'
import { profileService } from '~/features/profile/services/profile.api.js'
import { useUserStore } from '~/stores/userStore.js'
import { outgoingMessageReceiptLabel } from '~/utils/chatReceipts.js'
import { lastOwnUiMessageId } from '~/utils/chatMappers.js'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
  emitRoomJoin,
  startPresenceHeartbeat,
  stopPresenceHeartbeat,
} from '~/services/chatSocket.js'

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
  chatImageInputRef,
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
  openChatImagePicker,
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
  return msg?.type === 'system' || msg?.metadata?.kind === 'call_log'
}

function isCallLogMessage(msg) {
  return msg?.metadata?.kind === 'call_log'
}

function callLogIcon(meta) {
  if (meta?.callType === 'video') {
    return 'fa-solid fa-video'
  }
  return 'fa-solid fa-phone'
}

function callLogTitle(meta) {
  const status = typeof meta?.status === 'string' ? meta.status : 'ended'
  if (status === 'missed') return 'Missed call'
  if (status === 'rejected') return 'Declined call'
  if (status === 'canceled') return 'Canceled call'
  if (status === 'interrupted') return 'Call interrupted'
  return 'Call ended'
}

function callLogTone(meta) {
  const status = typeof meta?.status === 'string' ? meta.status : 'ended'
  if (status === 'missed' || status === 'rejected') {
    return 'text-rose-600 bg-rose-50 border-rose-200'
  }
  return 'text-zinc-600 bg-zinc-100 border-zinc-200'
}

function callLogDuration(meta) {
  const sec = Number(meta?.durationSeconds || 0)
  if (!Number.isFinite(sec) || sec <= 0) {
    return ''
  }
  const min = Math.floor(sec / 60)
  const second = sec % 60
  return `${String(min).padStart(2, '0')}:${String(second).padStart(2, '0')}`
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

const STICKER_PACK_IDS = ['sticker1', 'sticker2']
const STICKER_PACK_LABELS = {
  sticker1: 'Loopy',
  sticker2: 'Capybara',
}
const STICKER_DISCOVERY_MAX = 80
const STICKER_DISCOVERY_MISS_STREAK = 12
const stickerPickerOpen = ref(false)
const stickerPackActive = ref('sticker1')
const stickerPackMap = ref({
  sticker1: [],
  sticker2: [],
})
const stickerPackLoaded = ref({
  sticker1: false,
  sticker2: false,
})

async function loadStickerPack(packId) {
  if (!STICKER_PACK_IDS.includes(packId) || stickerPackLoaded.value[packId]) {
    return
  }
  try {
    stickerPackMap.value[packId] = await discoverStickerPack(packId)
  } catch (e) {
    console.warn('loadStickerPack discovery', packId, e)
    stickerPackMap.value[packId] = []
  } finally {
    stickerPackLoaded.value[packId] = true
  }
}

async function discoverStickerPack(packId) {
  const result = []
  const seen = new Set()
  let missStreak = 0
  for (let i = 1; i <= STICKER_DISCOVERY_MAX; i++) {
    const candidates = [
      `/${packId}/image${i}.jpg`,
      `/${packId}/image${i}.jpeg`,
      `/${packId}/image${i}.png`,
      `/${packId}/image${i}.webp`,
      `/${packId}/${i}.jpg`,
      `/${packId}/${i}.jpeg`,
      `/${packId}/${i}.png`,
      `/${packId}/${i}.webp`,
    ]
    let foundForIndex = false
    for (const url of candidates) {
      if (seen.has(url)) {
        continue
      }
      seen.add(url)
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' })
        if (!res.ok) {
          continue
        }
        result.push({
          id: `${packId}-${i}-${result.length + 1}`,
          pack: packId,
          url,
        })
        foundForIndex = true
        break
      } catch {
        // ignore network errors and continue probing
      }
    }
    if (foundForIndex) {
      missStreak = 0
    } else {
      missStreak += 1
      if (result.length > 0 && missStreak >= STICKER_DISCOVERY_MISS_STREAK) {
        break
      }
    }
  }
  return result
}

function toggleStickerPicker() {
  if (!stickerPickerOpen.value && !messagingAllowed.value) {
    return
  }
  stickerPickerOpen.value = !stickerPickerOpen.value
  if (stickerPickerOpen.value) {
    loadStickerPack(stickerPackActive.value)
  }
}

function selectStickerPack(packId) {
  stickerPackActive.value = packId
  loadStickerPack(packId)
}

const stickerRows = computed(() => stickerPackMap.value[stickerPackActive.value] || [])

function onStickerImageError(sticker) {
  const list = stickerPackMap.value[sticker.pack] || []
  stickerPackMap.value[sticker.pack] = list.filter(x => x.id !== sticker.id)
}

function sendStickerMessage(sticker) {
  if (!messagingAllowed.value) {
    return
  }
  stopTypingNow()
  postChatSticker(sticker, unlockNotifyAudio)
  stickerPickerOpen.value = false
}

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

const threadSearchOpen = ref(false)
const threadSearchDraft = ref('')
const threadSearchLoading = ref(false)
const threadSearchResults = ref([])
const threadSearchNextCursor = ref(null)
const threadSearchHasMore = ref(false)
let threadSearchDebounceTimer = null

function clearThreadSearchDebounce() {
  if (threadSearchDebounceTimer) {
    clearTimeout(threadSearchDebounceTimer)
    threadSearchDebounceTimer = null
  }
}

function resetThreadSearchState() {
  clearThreadSearchDebounce()
  threadSearchDraft.value = ''
  threadSearchResults.value = []
  threadSearchNextCursor.value = null
  threadSearchHasMore.value = false
  threadSearchLoading.value = false
}

function toggleThreadSearch() {
  threadSearchOpen.value = !threadSearchOpen.value
  if (!threadSearchOpen.value) {
    resetThreadSearchState()
  }
}

watch(selectedId, () => {
  threadSearchOpen.value = false
  resetThreadSearchState()
})

async function fetchThreadSearch({ append = false } = {}) {
  const cid = active.value?.id
  if (!cid || !threadSearchOpen.value) {
    return
  }
  const q = threadSearchDraft.value.trim()
  if (!q) {
    if (!append) {
      threadSearchResults.value = []
      threadSearchNextCursor.value = null
      threadSearchHasMore.value = false
    }
    return
  }
  threadSearchLoading.value = true
  try {
    const res = await chatApi.searchMessagesInConversation(cid, {
      q,
      chunkSize: 20,
      ...(append && threadSearchNextCursor.value
        ? { cursor: threadSearchNextCursor.value }
        : {}),
    })
    const data = unwrapChatData(res)
    const hits = Array.isArray(data?.hits) ? data.hits : []
    threadSearchNextCursor.value = data?.nextCursor ?? null
    threadSearchHasMore.value = Boolean(data?.hasMore)
    if (append) {
      threadSearchResults.value = [...threadSearchResults.value, ...hits]
    } else {
      threadSearchResults.value = hits
    }
  } catch (e) {
    console.error('searchMessages', e)
    if (!append) {
      threadSearchResults.value = []
      threadSearchNextCursor.value = null
      threadSearchHasMore.value = false
    }
    notification.error({
      message: 'Search',
      description: e.response?.data?.message || 'Could not search messages.',
    })
  } finally {
    threadSearchLoading.value = false
  }
}

watch(threadSearchDraft, () => {
  if (!threadSearchOpen.value) {
    return
  }
  clearThreadSearchDebounce()
  threadSearchDebounceTimer = setTimeout(() => {
    threadSearchDebounceTimer = null
    fetchThreadSearch({ append: false })
  }, 420)
})

watch(threadSearchOpen, (open) => {
  if (open && threadSearchDraft.value.trim()) {
    clearThreadSearchDebounce()
    fetchThreadSearch({ append: false })
  }
})

function loadMoreThreadSearch() {
  if (!threadSearchHasMore.value || threadSearchLoading.value) {
    return
  }
  fetchThreadSearch({ append: true })
}

function escapeRegExpForHighlight(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function messageSearchSegments(text) {
  const q = threadSearchDraft.value.trim()
  const t = String(text ?? '')
  if (!q) {
    return [{ match: false, text: t }]
  }
  let re
  try {
    re = new RegExp(`(${escapeRegExpForHighlight(q)})`, 'gi')
  } catch {
    return [{ match: false, text: t }]
  }
  const out = []
  let last = 0
  const s = t
  let m = re.exec(s)
  while (m != null) {
    if (m.index > last) {
      out.push({ match: false, text: s.slice(last, m.index) })
    }
    out.push({ match: true, text: m[1] })
    last = m.index + m[1].length
    if (m[0].length === 0) {
      re.lastIndex++
    }
    m = re.exec(s)
  }
  if (last < s.length) {
    out.push({ match: false, text: s.slice(last) })
  }
  return out.length ? out : [{ match: false, text: t }]
}

function threadSearchHitAuthor(hit) {
  if (hit?.isOwn) {
    return 'You'
  }
  return active.value?.name || 'User'
}

async function onThreadSearchResultClick(hit) {
  const id = hit?.id != null ? String(hit.id) : ''
  if (!id) {
    return
  }
  threadSearchOpen.value = false
  resetThreadSearchState()
  await jumpToMessage(id)
}

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

/** Pinned messages: compact bar + expandable list. */
const pinnedListExpanded = ref(false)
const pinnedHeaderMenuOpen = ref(false)
const pinnedRowMenuForId = ref(null)

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

function closePinnedPanel() {
  pinnedListExpanded.value = false
  pinnedHeaderMenuOpen.value = false
  pinnedRowMenuForId.value = null
}

function togglePinnedListExpand() {
  pinnedListExpanded.value = !pinnedListExpanded.value
  pinnedHeaderMenuOpen.value = false
  pinnedRowMenuForId.value = null
}

function togglePinnedHeaderMenu() {
  pinnedHeaderMenuOpen.value = !pinnedHeaderMenuOpen.value
  pinnedRowMenuForId.value = null
}

function togglePinnedRowMenu(messageId) {
  const id = String(messageId ?? '')
  pinnedRowMenuForId.value = pinnedRowMenuForId.value === id ? null : id
  pinnedHeaderMenuOpen.value = false
}

function isPinnedRowMenuOpen(messageId) {
  return pinnedRowMenuForId.value === String(messageId ?? '')
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
    if (!(active.value?.pinnedMessages?.length)) {
      closePinnedPanel()
    }
    pinnedRowMenuForId.value = null
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
  pinnedHeaderMenuOpen.value = false
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
    closePinnedPanel()
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
  pinnedRowMenuForId.value = null
  pinnedHeaderMenuOpen.value = false
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
    pinnedListExpanded.value = false
    jumpToMessage(mid)
  }
}

function jumpToOriginalMessage(messageId) {
  closeMessageActionMenu()
  jumpToMessage(messageId)
}

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

function openChatImagePickerGuarded() {
  if (!messagingAllowed.value) {
    return
  }
  openChatImagePicker()
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
  closePinnedPanel()
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
        <aside
          class="flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-zinc-200/90 bg-white md:h-full md:w-[300px] lg:w-[320px] md:border-r"
          :class="mobileShowThread ? 'hidden md:flex' : 'flex flex-1 md:flex-none'"
        >
          <div class="border-b border-zinc-200/90 px-4 pb-3 pt-3">
            <div class="flex items-center justify-between gap-3">
              <h1 class="text-[18px] font-semibold tracking-tight text-zinc-900">
                Messages
              </h1>
              <NuxtLink
                to="/account"
                class="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-200/90"
              >
                Account
              </NuxtLink>
            </div>
            <div class="mt-3 flex gap-1 rounded-full bg-zinc-100/90 p-1">
              <button
                type="button"
                class="min-h-9 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition"
                :class="
                  listFolder === 'inbox'
                    ? 'bg-white text-[#1877f2] shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                "
                @click="setListFolder('inbox')"
              >
                <span>Inbox</span>
                <span
                  v-if="inboxUnreadTotal > 0"
                  class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
                  :class="listFolder === 'inbox' ? 'bg-[#1877f2]' : 'bg-zinc-500'"
                >{{ inboxUnreadTotal > 99 ? '99+' : inboxUnreadTotal }}</span>
              </button>
              <button
                type="button"
                class="min-h-9 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition"
                :class="
                  listFolder === 'pending'
                    ? 'bg-white text-[#1877f2] shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900'
                "
                @click="setListFolder('pending')"
              >
                <span>Pending</span>
                <span
                  v-if="pendingUnreadTotal > 0"
                  class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
                  :class="listFolder === 'pending' ? 'bg-[#1877f2]' : 'bg-zinc-500'"
                >{{ pendingUnreadTotal > 99 ? '99+' : pendingUnreadTotal }}</span>
              </button>
            </div>
            <label class="relative mt-4 block">
              <span class="sr-only">Search</span>
              <i
                class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#1877f2]/40"
              />
              <input
                v-model="query"
                type="search"
                placeholder="Search people or messages"
                class="w-full rounded-full border border-zinc-200/90 bg-zinc-50 py-2 pl-10 pr-4 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#1877f2]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877f2]/12"
              >
            </label>
          </div>

          <ul class="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto">
            <li v-if="listLoading" class="px-4 py-10 text-center text-[14px] text-zinc-500">
              Loading…
            </li>
            <li v-else-if="conversations.length === 0" class="px-4 py-14 text-center text-[14px] text-zinc-500">
              No conversations yet.
            </li>
            <li v-else-if="filtered.length === 0" class="px-4 py-14 text-center text-[14px] text-zinc-500">
              No results.
            </li>
            <li v-for="c in filtered" :key="c.id">
              <button
                type="button"
                class="flex w-full gap-3 border-l-[4px] py-3 pl-3 pr-3 text-left transition-colors"
                :class="
                  selectedId === c.id
                    ? 'border-[#1877f2] bg-zinc-50/90'
                    : 'border-transparent hover:bg-zinc-50'
                "
                @click="selectConversation(c.id)"
              >
                <div
                  class="relative shrink-0 cursor-pointer"
                  role="button"
                  tabindex="0"
                  aria-label="Open profile"
                  @click.stop.prevent="openPeerProfile(c)"
                  @keydown.enter.stop.prevent="openPeerProfile(c)"
                >
                  <img
                    v-if="!isAvatarBroken(c.id)"
                    :src="c.peerAvatarUrl || defaultAvatarUrl"
                    alt=""
                    width="48"
                    height="48"
                    class="h-12 w-12 rounded-full object-cover shadow-sm"
                    loading="lazy"
                    decoding="async"
                    @error="markAvatarBroken(c.id)"
                  >
                  <div
                    v-else
                    class="flex h-12 w-12 items-center justify-center rounded-full text-[13px] font-semibold text-white shadow-sm"
                    :class="fallbackClass(c.id)"
                  >
                    {{ initials(c.name) }}
                  </div>
                  <span
                    v-if="c.online"
                    class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"
                    aria-hidden="true"
                  />
                </div>
                <div class="min-w-0 flex-1 py-0.5">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="truncate text-[15px] font-semibold text-zinc-900">{{ c.name }}</span>
                    <time class="shrink-0 text-[11px] tabular-nums text-zinc-400">{{ timeLabel(c.updatedAt) }}</time>
                  </div>
                  <p class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-zinc-500">
                    {{ c.lastMessage }}
                  </p>
                </div>
                <span
                  v-if="c.unreadCount > 0"
                  class="self-center flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#1877f2] px-1.5 text-[11px] font-bold text-white"
                >{{ c.unreadCount > 9 ? '9+' : c.unreadCount }}</span>
              </button>
            </li>
          </ul>
        </aside>

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

              <div
                v-if="threadSearchOpen && active"
                class="border-b border-zinc-200 bg-white px-4 py-3 sm:px-5"
              >
                <label class="relative block">
                  <span class="sr-only">Search in conversation</span>
                  <i
                    class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#1877f2]/40"
                  />
                  <input
                    v-model="threadSearchDraft"
                    type="search"
                    autocomplete="off"
                    placeholder="Search in conversation"
                    class="w-full rounded-full border border-zinc-200/90 bg-zinc-50 py-2 pl-10 pr-4 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#1877f2]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877f2]/12"
                  >
                </label>
                <div
                  v-if="threadSearchLoading && threadSearchResults.length === 0 && threadSearchDraft.trim()"
                  class="mt-3 text-center text-[13px] text-zinc-500"
                >
                  Searching…
                </div>
                <ul
                  v-else-if="threadSearchDraft.trim() && threadSearchResults.length"
                  class="mt-2 max-h-[min(40vh,16rem)] divide-y divide-zinc-100 overflow-y-auto rounded-xl border border-zinc-200/90 bg-zinc-50/50"
                >
                  <li v-for="hit in threadSearchResults" :key="String(hit.id)">
                    <button
                      type="button"
                      class="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-white"
                      @click="onThreadSearchResultClick(hit)"
                    >
                      <div class="min-w-0 flex-1">
                        <p class="text-[12px] text-zinc-500">
                          {{ threadSearchHitAuthor(hit) }}
                          <span class="tabular-nums text-zinc-400"> · {{ timeLabel(hit.createdAt) }}</span>
                        </p>
                        <p class="mt-0.5 line-clamp-2 text-[14px] leading-snug text-zinc-800">
                          <template
                            v-for="(seg, i) in messageSearchSegments(hit.text)"
                            :key="`${String(hit.id)}-seg-${i}`"
                          >
                            <mark
                              v-if="seg.match"
                              class="bg-amber-200/90 font-semibold text-inherit [box-decoration-break:clone]"
                            >{{ seg.text }}</mark>
                            <span v-else>{{ seg.text }}</span>
                          </template>
                        </p>
                      </div>
                      <i
                        class="fa-solid fa-chevron-right mt-1 shrink-0 text-[11px] text-zinc-400"
                        aria-hidden="true"
                      />
                    </button>
                  </li>
                </ul>
                <p
                  v-else-if="threadSearchDraft.trim() && !threadSearchLoading"
                  class="mt-3 text-center text-[13px] text-zinc-500"
                >
                  No messages found.
                </p>
                <p v-else class="mt-2 text-[12px] leading-snug text-zinc-400">
                  Type to search this chat. Recalled messages are skipped.
                </p>
                <button
                  v-if="threadSearchHasMore && threadSearchResults.length"
                  type="button"
                  class="mt-2 w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                  :disabled="threadSearchLoading"
                  @click="loadMoreThreadSearch"
                >
                  {{ threadSearchLoading ? 'Loading…' : 'Load more results' }}
                </button>
              </div>

              <div
                v-if="active.pinnedMessages?.length"
                class="border-b border-zinc-200/90 bg-[#f0f2f5] px-2 py-1.5 sm:px-4"
              >
                <!-- Compact pinned bar (matches chat: white + #1877f2) -->
                <div
                  class="flex items-stretch gap-2 rounded-xl border border-zinc-200/90 bg-white px-2 py-2 text-zinc-900 shadow-sm sm:gap-2.5 sm:px-3"
                >
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877f2] sm:h-11 sm:w-11"
                    aria-hidden="true"
                  >
                    <i class="fa-solid fa-thumbtack text-[14px] text-white sm:text-[15px]" />
                  </div>
                  <button
                    type="button"
                    class="min-w-0 flex-1 text-left transition hover:opacity-90"
                    @click="onPinnedBannerClick(active.pinnedMessages[0])"
                  >
                    <p class="text-[13px] font-semibold leading-tight text-zinc-900">
                      Pinned message
                    </p>
                    <p class="mt-0.5 line-clamp-1 text-[12px] leading-snug text-zinc-500">
                      <template v-if="active.pinnedMessages[0]?.unavailable">
                        {{ active.pinnedMessages[0]?.unavailableReason || 'This message is no longer available.' }}
                      </template>
                      <template v-else>
                        {{ pinnedBannerPreview(active.pinnedMessages[0]) }}
                      </template>
                    </p>
                  </button>
                  <div class="flex shrink-0 items-center gap-0.5">
                    <button
                      v-if="active.pinnedMessages.length > 1"
                      type="button"
                      class="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-100"
                      @click.stop="togglePinnedListExpand"
                    >
                      +{{ active.pinnedMessages.length - 1 }} pinned
                      <i
                        class="fa-solid text-[10px] text-zinc-500"
                        :class="pinnedListExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
                        aria-hidden="true"
                      />
                    </button>
                    <div class="relative">
                      <button
                        type="button"
                        class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100"
                        aria-label="Pinned messages options"
                        @click.stop="togglePinnedHeaderMenu"
                      >
                        <i class="fa-solid fa-ellipsis text-[15px]" />
                      </button>
                      <div
                        v-if="pinnedHeaderMenuOpen"
                        class="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-[13px] text-zinc-800 shadow-xl"
                        @click.stop
                      >
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50"
                          @click="togglePinnedListExpand"
                        >
                          <i class="fa-solid fa-list w-4 text-center text-zinc-500" />
                          <span>{{ pinnedListExpanded ? 'Collapse list' : 'View pinned list' }}</span>
                        </button>
                        <button
                          type="button"
                          class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
                          @click="unpinAllPinned"
                        >
                          <i class="fa-solid fa-thumbtack w-4 rotate-45 text-center text-[11px]" />
                          <span>Unpin all</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Expanded list (in document flow) -->
                <div
                  v-if="pinnedListExpanded"
                  class="mt-2 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-md"
                >
                  <div class="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5">
                    <span class="text-[14px] font-semibold text-zinc-900">
                      Pinned messages ({{ active.pinnedMessages.length }})
                    </span>
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 text-[13px] font-medium text-[#1877f2] transition hover:underline"
                      @click="pinnedListExpanded = false"
                    >
                      Collapse
                      <i class="fa-solid fa-chevron-up text-[11px]" aria-hidden="true" />
                    </button>
                  </div>
                  <ul class="max-h-[min(50vh,16rem)] divide-y divide-zinc-100 overflow-y-auto">
                    <li
                      v-for="pin in active.pinnedMessages"
                      :key="String(pin.messageId)"
                      class="relative"
                    >
                      <button
                        type="button"
                        class="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-zinc-50"
                        @click="onPinnedBannerClick(pin)"
                      >
                        <div
                          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877f2]/12"
                          aria-hidden="true"
                        >
                          <i class="fa-solid fa-thumbtack text-[12px] text-[#1877f2]" />
                        </div>
                        <div class="min-w-0 flex-1 pr-9">
                          <p class="text-[13px] font-semibold text-zinc-900">
                            Pinned message
                          </p>
                          <p class="mt-0.5 line-clamp-2 text-[12px] leading-snug text-zinc-600">
                            <template v-if="pin.unavailable">
                              {{ pin.unavailableReason || 'This message is no longer available.' }}
                            </template>
                            <template v-else>
                              {{ pinnedBannerPreview(pin) }}
                            </template>
                          </p>
                        </div>
                      </button>
                      <div class="absolute right-2 top-2">
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800"
                          aria-label="Pinned message actions"
                          @click.stop="togglePinnedRowMenu(pin.messageId)"
                        >
                          <i class="fa-solid fa-ellipsis text-[14px]" />
                        </button>
                        <div
                          v-if="isPinnedRowMenuOpen(pin.messageId)"
                          class="absolute right-0 top-full z-30 mt-0.5 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-[13px] shadow-xl"
                          @click.stop
                        >
                          <button
                            type="button"
                            class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                            @click="unpinPinnedEntry(pin)"
                          >
                            <i class="fa-solid fa-thumbtack rotate-45 text-[11px]" />
                            <span>Unpin</span>
                          </button>
                        </div>
                      </div>
                    </li>
                  </ul>
                  <div class="border-t border-zinc-100 px-3 py-2 text-center">
                    <p class="text-[12px] text-zinc-500">
                      Tap a row to jump to that message in the chat.
                    </p>
                  </div>
                </div>
              </div>

              <div
                ref="messagesScrollEl"
                class="chat-messages-scroll relative min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
                @scroll.passive="onMessagesScrollWithJump"
              >
                <button
                  v-if="showJumpToLatest"
                  type="button"
                  class="fixed bottom-24 right-4 z-[35] inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#1877f2] text-white shadow-lg transition hover:bg-[#166fe5] active:scale-[0.96] md:bottom-24 md:right-6"
                  aria-label="Quay lại tin nhắn mới"
                  @click="jumpToLatestMessage"
                >
                  <i class="fa-solid fa-chevron-down text-[13px]" />
                </button>
                <p
                  v-if="messagesLoading"
                  class="absolute left-1/2 top-3 z-[1] -translate-x-1/2 rounded-full bg-white/90 px-3 py-1 text-[12px] text-zinc-500 shadow-sm"
                >
                  Loading messages…
                </p>
                <div
                  v-if="loadingOlderMessages"
                  class="flex shrink-0 flex-col items-center pb-2 pt-0.5"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <div class="flex items-center gap-2 text-[12px] text-zinc-500">
                    <i class="fa-solid fa-spinner fa-spin text-[13px] text-[#1877f2]" aria-hidden="true" />
                    <span>Loading earlier messages…</span>
                  </div>
                </div>
                <div class="flex w-full flex-col">
                  <div
                    v-for="row in activeMessageRows"
                    :key="row.msg.id"
                    class="flex gap-2.5"
                    :data-message-id="row.msg.id"
                    :class="[
                      isSystemMessage(row.msg)
                        ? 'justify-center'
                        : row.msg.me
                          ? 'justify-end'
                          : 'justify-start',
                      row.groupFirst && row.index > 0 ? 'mt-3' : row.groupFirst ? '' : 'mt-0.5',
                      highlightedMessageId === String(row.msg.id) ? 'rounded-2xl ring-2 ring-[#1877f2]/35 ring-offset-2 ring-offset-[#f0f2f5]' : ''
                    ]"
                  >
                    <img
                      v-if="!isSystemMessage(row.msg) && !row.msg.me && row.groupLast && !isAvatarBroken(active.id)"
                      :src="active.peerAvatarUrl || defaultAvatarUrl"
                      alt=""
                      width="28"
                      height="28"
                      class="mt-0.5 h-7 w-7 shrink-0 self-end rounded-full object-cover"
                      loading="lazy"
                      decoding="async"
                      role="button"
                      tabindex="0"
                      aria-label="Open profile"
                      @click.stop.prevent="openPeerProfile(active)"
                      @keydown.enter.stop.prevent="openPeerProfile(active)"
                    >
                    <div
                      v-else-if="!isSystemMessage(row.msg) && !row.msg.me && row.groupLast"
                      class="mt-0.5 flex h-7 w-7 shrink-0 self-end cursor-pointer items-center justify-center rounded-full text-[10px] font-bold text-white"
                      :class="fallbackClass(active.id)"
                      role="button"
                      tabindex="0"
                      aria-label="Open profile"
                      @click.stop.prevent="openPeerProfile(active)"
                      @keydown.enter.stop.prevent="openPeerProfile(active)"
                    >
                      {{ initials(active.name).slice(0, 1) }}
                    </div>
                    <div
                      v-else-if="!isSystemMessage(row.msg) && !row.msg.me"
                      class="mt-0.5 w-7 shrink-0 self-end"
                      aria-hidden="true"
                    />
                    <div
                      class="max-w-[85%] sm:max-w-[70%]"
                      :class="[
                        row.msg.me ? 'flex flex-col items-end' : '',
                        isSystemMessage(row.msg) ? 'w-full max-w-full sm:max-w-full flex items-center' : ''
                      ]"
                    >
                      <div class="relative group/message">
                        <div
                          v-if="!isSystemMessage(row.msg)"
                          class="absolute top-1 z-10 flex items-center gap-1 transition-opacity"
                          :class="[
                            row.msg.me ? 'right-[calc(100%+8px)]' : 'left-[calc(100%+8px)]',
                            shouldShowMessageActions(row.msg)
                              ? 'opacity-100 pointer-events-auto'
                              : 'opacity-0 pointer-events-none'
                          ]"
                          @mouseenter="onMessageActionHoverEnter(row.msg.id)"
                          @mouseleave="onMessageActionHoverLeave(row.msg.id)"
                        >
                          <button
                            v-if="!row.msg.recalledAt"
                            type="button"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-[#1877f2]"
                            aria-label="Reply"
                            @click.stop="startReplyToMessage(row.msg)"
                          >
                            <i class="fa-solid fa-reply text-[12px]" />
                          </button>
                          <button
                            type="button"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-[#1877f2]"
                            aria-label="Copy"
                            @click.stop="copyMessageToClipboard(row.msg)"
                          >
                            <i class="fa-regular fa-copy text-[12px]" />
                          </button>
                          <button
                            type="button"
                            class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition hover:text-zinc-700"
                            aria-label="More actions"
                            @click.stop="toggleMessageActionMenu(row.msg.id)"
                          >
                            <i class="fa-solid fa-ellipsis text-[12px]" />
                          </button>
                          <div
                            v-if="isMessageActionMenuOpen(row.msg.id)"
                            class="absolute top-full z-20 mt-2 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-[13px] text-zinc-700 shadow-xl"
                            :class="row.msg.me ? 'right-0' : 'left-0'"
                            @click.stop
                          >
                            <button
                              v-if="!row.msg.recalledAt && !isPinnedMessageId(row.msg.id) && canPinAnotherMessage()"
                              type="button"
                              class="flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-50"
                              @click="pinMessageRow(row.msg)"
                            >
                              <i class="fa-solid fa-thumbtack text-[12px]" />
                              <span>Pin</span>
                            </button>
                            <button
                              v-if="!row.msg.recalledAt && isPinnedMessageId(row.msg.id)"
                              type="button"
                              class="flex w-full items-center gap-2 px-3 py-2 hover:bg-zinc-50"
                              @click="unpinMessageRow(row.msg)"
                            >
                              <i class="fa-solid fa-thumbtack rotate-45 text-[12px] text-zinc-500" />
                              <span>Unpin</span>
                            </button>
                            <button
                              v-if="row.msg.me && !row.msg.recalledAt"
                              type="button"
                              class="flex w-full items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50"
                              @click="recallMessageForEveryone(row.msg)"
                            >
                              <i class="fa-solid fa-trash-can text-[12px]" />
                              <span>Recall</span>
                            </button>
                          </div>
                        </div>
                        <div
                          class="px-3.5 py-2.5 text-[15px] leading-[1.45] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                          :class="
                            isSystemMessage(row.msg)
                              ? [
                                  'rounded-full border border-zinc-200/80 bg-zinc-100/95 text-zinc-600 text-[12px] font-medium shadow-none'
                                ]
                              : row.msg.isSticker
                              ? [
                                  'bg-transparent px-0 py-0 shadow-none'
                                ]
                              : row.msg.me
                              ? [
                                  row.groupLast ? 'rounded-[18px] rounded-br-[4px]' : 'rounded-[18px]',
                                  'bg-[#1877f2] text-white cursor-pointer active:opacity-95'
                                ]
                              : [
                                  row.groupLast ? 'rounded-[18px] rounded-bl-[4px]' : 'rounded-[18px]',
                                  'border border-zinc-200/80 bg-white text-zinc-800'
                                ]
                          "
                          @click.stop="row.msg.me && !isSystemMessage(row.msg) && toggleOutgoingReceiptDetail(row.msg.id)"
                          @mouseenter="!isSystemMessage(row.msg) && onMessageActionHoverEnter(row.msg.id)"
                          @mouseleave="!isSystemMessage(row.msg) && onMessageActionHoverLeave(row.msg.id)"
                        >
                          <p
                            v-if="isSystemMessage(row.msg) && !isCallLogMessage(row.msg)"
                            class="whitespace-pre-wrap break-words text-center"
                          >
                            {{ row.msg.text }}
                          </p>
                          <div
                            v-else-if="isCallLogMessage(row.msg)"
                            class="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-medium"
                            :class="callLogTone(row.msg.metadata)"
                          >
                            <i :class="callLogIcon(row.msg.metadata)" />
                            <span>{{ callLogTitle(row.msg.metadata) }}</span>
                            <span v-if="callLogDuration(row.msg.metadata)" class="opacity-80">
                              · {{ callLogDuration(row.msg.metadata) }}
                            </span>
                          </div>
                          <p
                            v-else-if="row.msg.recalledAt"
                            class="text-[14px] italic text-white/85"
                            :class="row.msg.me ? '' : 'text-zinc-500'"
                          >
                            This message was recalled
                          </p>
                          <button
                            v-else-if="row.msg.replyPreview && row.msg.replyToMessageId"
                            type="button"
                            class="mb-2 w-full rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-left text-[13px] leading-snug text-white/90"
                            :class="row.msg.me ? '' : 'border-zinc-200 bg-zinc-50 text-zinc-600'"
                            @click.stop="jumpToOriginalMessage(row.msg.replyToMessageId)"
                          >
                            <p class="truncate font-semibold">
                              Reply
                            </p>
                            <p class="mt-0.5 line-clamp-2">
                              {{ row.msg.replyPreview.text || '[Attachment]' }}
                            </p>
                          </button>
                          <img
                            v-if="!row.msg.recalledAt && row.msg.isSticker && row.msg.stickerUrl"
                            :src="row.msg.stickerUrl"
                            alt="sticker"
                            class="h-auto w-full max-w-[180px] object-contain"
                            loading="lazy"
                            decoding="async"
                          >
                          <img
                            v-if="!row.msg.recalledAt && row.msg.imageUrl"
                            :src="row.msg.imageUrl"
                            alt=""
                            class="max-h-64 w-full max-w-[280px] rounded-lg object-cover"
                            loading="lazy"
                            decoding="async"
                          >
                          <p
                            v-if="!row.msg.recalledAt && row.msg.text && !row.msg.isSticker"
                            class="whitespace-pre-wrap break-words"
                            :class="row.msg.imageUrl ? 'mt-2' : ''"
                          >
                            {{ row.msg.text }}
                          </p>
                        </div>
                      </div>
                      <p
                        v-if="row.showMeta"
                        class="mt-1 flex flex-wrap items-center gap-x-1.5 px-1.5 text-[11px] text-zinc-400"
                        :class="
                          isSystemMessage(row.msg)
                            ? 'justify-center text-center'
                            : row.msg.me
                              ? 'justify-end text-right'
                              : 'text-left'
                        "
                      >
                        <span>{{ timeLabel(row.msg.at) }}</span>
                        <span
                          v-if="row.msg.me && shouldShowOutgoingReceipt(active.messages, row.msg.id, active) && receiptLabel(active, row.msg.id)"
                        >· {{ receiptLabel(active, row.msg.id) }}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t border-zinc-200 bg-white px-4 py-3 sm:px-5">
                <div
                  v-if="messagingGateBannerText"
                  class="mb-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-950"
                  role="status"
                >
                  {{ messagingGateBannerText }}
                </div>
                <div
                  v-if="peerTyping"
                  class="mb-2 flex items-center gap-2 px-1 text-[12px] text-zinc-500"
                >
                  <div class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1">
                    <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
                    <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
                    <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
                  </div>
                  <span>{{ active.name }} is typing...</span>
                </div>
                <input
                  ref="chatImageInputRef"
                  type="file"
                  class="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  @change="onChatImageSelected"
                >
                <form @submit.prevent="sendMessage">
                  <div
                    v-if="stickerPickerOpen"
                    class="mb-2 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm"
                  >
                    <div class="flex items-center gap-1 border-b border-zinc-100 px-2 py-2">
                      <button
                        v-for="pack in STICKER_PACK_IDS"
                        :key="pack"
                        type="button"
                        class="rounded-full px-3 py-1 text-[12px] font-medium transition"
                        :class="stickerPackActive === pack ? 'bg-[#1877f2] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'"
                        @click="selectStickerPack(pack)"
                      >
                        {{ STICKER_PACK_LABELS[pack] || pack }}
                      </button>
                    </div>
                    <div class="max-h-56 overflow-y-auto p-2">
                      <p
                        v-if="!stickerRows.length"
                        class="px-2 py-6 text-center text-[12px] text-zinc-500"
                      >
                        No stickers found in <code>/{{ stickerPackActive }}/manifest.json</code>.
                      </p>
                      <div v-else class="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
                        <button
                          v-for="sticker in stickerRows"
                          :key="sticker.id"
                          type="button"
                          class="rounded-xl bg-zinc-50 p-1.5 transition hover:bg-zinc-100"
                          @click="sendStickerMessage(sticker)"
                        >
                          <img
                            :src="sticker.url"
                            alt=""
                            class="h-14 w-full object-contain sm:h-16"
                            loading="lazy"
                            decoding="async"
                            @error="onStickerImageError(sticker)"
                          >
                        </button>
                      </div>
                    </div>
                  </div>
                  <div
                    v-if="pendingChatImage"
                    class="mb-2 flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50 p-2"
                  >
                    <img
                      :src="pendingChatImage.previewUrl"
                      alt=""
                      class="h-14 w-14 rounded-lg object-cover"
                    >
                    <span class="flex-1 text-[13px] text-zinc-600">Ready to send</span>
                    <button
                      type="button"
                      class="rounded-full px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-200/80"
                      @click="clearPendingChatImage"
                    >
                      Remove
                    </button>
                  </div>
                  <div
                    v-if="replyTo"
                    class="mb-2 flex items-start gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50 p-2"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="text-[12px] font-semibold text-zinc-700">
                        Replying
                      </p>
                      <p class="mt-0.5 line-clamp-2 text-[13px] text-zinc-600">
                        {{ replyTo.text || (replyTo.imageUrl ? '[Attachment]' : '') }}
                      </p>
                    </div>
                    <button
                      type="button"
                      class="rounded-full px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-200/80"
                      @click="clearReplyToMessage"
                    >
                      Remove
                    </button>
                  </div>
                  <div
                    class="composer-bar flex min-h-[48px] items-center gap-1.5 rounded-full border border-zinc-200/90 bg-[#f0f2f5] py-1.5 pl-2.5 pr-2 transition focus-within:border-[#1877f2]/35 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(24,119,242,0.12)]"
                  >
                    <button
                      type="button"
                      class="composer-icon-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-[#1877f2]"
                      aria-label="Attach photo"
                      :disabled="!messagingAllowed"
                      @click="openChatImagePickerGuarded"
                    >
                      <i class="fa-solid fa-plus text-[18px] leading-none" />
                    </button>
                    <button
                      type="button"
                      class="composer-icon-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-[#1877f2]"
                      aria-label="Open sticker picker"
                      :disabled="!messagingAllowed"
                      @click="toggleStickerPicker"
                    >
                      <i class="fa-regular fa-face-smile text-[18px] leading-none" />
                    </button>
                    <textarea
                      v-model="draft"
                      rows="1"
                      placeholder="Message"
                      autocomplete="off"
                      class="min-h-[40px] max-h-28 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2.5 align-middle text-[15px] leading-[1.35] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
                      :disabled="!messagingAllowed"
                      @input="onComposerInput"
                      @blur="stopTypingNow"
                      @keydown="onComposerKeydown"
                    />
                    <button
                      type="submit"
                      class="composer-send flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-[14px] text-white shadow-sm transition hover:bg-[#166fe5] active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#e4e6eb] disabled:text-[#bcc0c4] disabled:shadow-none"
                      :disabled="!messagingAllowed || ((!draft.trim() && !pendingChatImage) || sendPending)"
                      aria-label="Send"
                    >
                      <i class="fa-solid fa-arrow-up leading-none" />
                    </button>
                  </div>
                </form>
              </div>
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
