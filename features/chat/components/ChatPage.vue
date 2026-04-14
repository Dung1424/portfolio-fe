<script setup>
import { picsumAvatarUrl } from '~/utils/picsumAvatar.js'
import { useUserStore } from '~/stores/userStore.js'
import { useResolvePublicMediaUrl } from '~/composables/useMediaBase'
import { notification } from 'ant-design-vue'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import { profileService } from '~/features/profile/services/profile.api.js'
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
  emitRoomJoin,
  startPresenceHeartbeat,
  stopPresenceHeartbeat,
} from '~/services/chatSocket.js'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { resolveMediaUrl } = useResolvePublicMediaUrl()

const peerProfileCache = new Map()

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

function avatarSrc(seed) {
  return picsumAvatarUrl(seed)
}

function peerUserIdFromParticipants(participants, myUserId) {
  if (!Array.isArray(participants) || myUserId == null) {
    return ''
  }
  const mine = String(myUserId)
  const other = participants.find(p => String(p.userId) !== mine)
  return other?.userId != null ? String(other.userId) : ''
}

function normalizeLastPreviewObject(p) {
  if (p == null) {
    return null
  }
  if (typeof p === 'string') {
    return { text: p, senderUserId: null }
  }
  return {
    text: p.text ?? '',
    senderUserId: p.senderUserId != null ? String(p.senderUserId) : null,
  }
}

function normalizeParticipantReceipts(list) {
  if (!Array.isArray(list)) {
    return []
  }
  return list.map((r) => {
    const read = r.lastReadMessageId ?? r.lastReadUpToMessageId ?? r.readUpToMessageId ?? null
    return {
      userId: String(r.userId),
      lastDeliveredMessageId: r.lastDeliveredMessageId != null ? String(r.lastDeliveredMessageId) : null,
      lastReadMessageId: read != null ? String(read) : null,
      updatedAt: r.updatedAt,
    }
  })
}

function maxWatermarkId(a, b) {
  if (!a) {
    return b ?? null
  }
  if (!b) {
    return a
  }
  return compareMongoObjectIdHex(a, b) >= 0 ? a : b
}

function patchParticipantReceipts(conv, receipts) {
  if (!conv || !Array.isArray(receipts) || receipts.length === 0) {
    return
  }
  const incoming = normalizeParticipantReceipts(receipts)
  const cur = Array.isArray(conv.participantReceipts) ? conv.participantReceipts : []
  const byUser = new Map()
  for (const r of cur) {
    byUser.set(String(r.userId), { ...r })
  }
  for (const r of incoming) {
    const uid = String(r.userId)
    const prev = byUser.get(uid)
    if (!prev) {
      byUser.set(uid, { ...r })
    }
    else {
      byUser.set(uid, {
        userId: uid,
        lastDeliveredMessageId: maxWatermarkId(prev.lastDeliveredMessageId, r.lastDeliveredMessageId),
        lastReadMessageId: maxWatermarkId(prev.lastReadMessageId, r.lastReadMessageId),
        updatedAt: r.updatedAt ?? prev.updatedAt,
      })
    }
  }
  conv.participantReceipts = [...byUser.values()]
}

function mergeParticipantReceiptsFromEnvelope(conv, data) {
  if (!conv || !data || typeof data !== 'object') {
    return
  }
  if (Array.isArray(data.participantReceipts)) {
    patchParticipantReceipts(conv, data.participantReceipts)
  }
}

function compareMongoObjectIdHex(a, b) {
  const sa = String(a ?? '').trim()
  const sb = String(b ?? '').trim()
  if (!sa && !sb) {
    return 0
  }
  if (!sa) {
    return -1
  }
  if (!sb) {
    return 1
  }
  if (sa === sb) {
    return 0
  }
  const hex = /^[0-9a-f]{24}$/i
  if (hex.test(sa) && hex.test(sb)) {
    return sa < sb ? -1 : 1
  }
  return sa.localeCompare(sb)
}

function messageIdAtOrBeforeWatermark(messageId, watermarkId) {
  if (!messageId || !watermarkId) {
    return false
  }
  return compareMongoObjectIdHex(messageId, watermarkId) <= 0
}

function isMongoObjectIdString(id) {
  const s = String(id ?? '')
  return s.length === 24 && /^[0-9a-f]{24}$/i.test(s)
}

function peerReceiptForConversation(conv) {
  const my = myUserId.value
  if (!conv?.participantReceipts?.length || my == null) {
    return null
  }
  return conv.participantReceipts.find(r => String(r.userId) !== String(my)) ?? null
}

function outgoingMessageReceiptLabel(conv, messageId) {
  if (!conv || conv.type !== 'direct' || !isMongoObjectIdString(messageId)) {
    return ''
  }
  const peer = peerReceiptForConversation(conv)
  if (!peer) {
    return '\u0110\u00e3 g\u1eedi'
  }
  const mid = String(messageId)
  const readW = peer.lastReadMessageId
  const delW = peer.lastDeliveredMessageId
  if (readW && messageIdAtOrBeforeWatermark(mid, readW)) {
    return '\u0110\u00e3 xem'
  }
  if (delW && messageIdAtOrBeforeWatermark(mid, delW)) {
    return '\u0110\u00e3 nh\u1eadn'
  }
  return '\u0110\u00e3 g\u1eedi'
}

function lastOwnUiMessageId(messages) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return null
  }
  for (let i = messages.length - 1; i >= 0; i--) {
    const row = messages[i]
    if (row?.me && row.id != null) {
      return String(row.id)
    }
  }
  return null
}

const receiptDetailForMessageId = ref(null)

function toggleOutgoingReceiptDetail(messageId) {
  if (messageId == null) {
    return
  }
  const id = String(messageId)
  receiptDetailForMessageId.value = receiptDetailForMessageId.value === id ? null : id
}

function shouldShowOutgoingReceipt(messages, messageId, conv) {
  if (messageId == null || !conv) {
    return false
  }
  const label = outgoingMessageReceiptLabel(conv, messageId)
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

function mapApiConversationToUi(apiConv, myUserIdVal) {
  const peerId = peerUserIdFromParticipants(apiConv.participants, myUserIdVal)
  const last = lastPreviewText(apiConv)
  const t = apiConv.lastMessageAt || apiConv.updatedAt
  return {
    id: String(apiConv.id),
    type: apiConv.type ?? 'direct',
    peerUserId: peerId,
    name: peerId ? `User ${String(peerId).replace(/-/g, '').slice(0, 8)}` : 'Chat',
    username: 'user',
    peerAvatarUrl: '',
    peerProfileLoaded: false,
    lastMessage: last,
    lastMessageId: apiConv.lastMessageId != null ? String(apiConv.lastMessageId) : null,
    lastMessagePreview: normalizeLastPreviewObject(apiConv.lastMessagePreview),
    updatedAt: t ? new Date(t) : new Date(),
    unreadCount: typeof apiConv.unreadCount === 'number' ? apiConv.unreadCount : 0,
    online: false,
    peerLastSeenAt: null,
    messages: [],
    messagesLoaded: false,
    messagesNextCursor: null,
    avatarSeed: peerId || String(apiConv.id),
    participantReceipts: normalizeParticipantReceipts(apiConv.participantReceipts),
  }
}

function lastPreviewText(apiConv) {
  const p = apiConv.lastMessagePreview
  if (p == null) {
    return ''
  }
  if (typeof p === 'string') {
    return p
  }
  return p.text ?? ''
}

async function fetchPeerProfile(peerUserId) {
  if (!peerUserId) {
    return null
  }
  if (peerProfileCache.has(peerUserId)) {
    return peerProfileCache.get(peerUserId)
  }
  try {
    const token = import.meta.client ? localStorage.getItem('token') : null
    const res = await profileService.fetchByUserId(peerUserId, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    const raw = res?.data?.data ?? res?.data
    const user = raw?.user ?? raw
    if (user?.id) {
      peerProfileCache.set(peerUserId, user)
      return user
    }
  }
  catch (e) {
    console.error('fetchPeerProfile', e)
  }
  return null
}

function applyPeerUserToConversation(conv, user) {
  if (!user || !conv) {
    return
  }
  conv.name = (user.name && String(user.name).trim()) || user.username || conv.name
  conv.username = user.username || conv.username
  const pic = user.profile_picture
  conv.peerAvatarUrl = pic ? resolveMediaUrl(pic) : ''
  conv.peerProfileLoaded = true
}

async function enrichAllConversationPeers(list) {
  const ids = [...new Set(list.map(c => c.peerUserId).filter(Boolean))]
  await Promise.all(
    ids.map(async (pid) => {
      const user = await fetchPeerProfile(String(pid))
      if (!user) {
        return
      }
      for (const c of list) {
        if (String(c.peerUserId) === String(pid)) {
          applyPeerUserToConversation(c, user)
        }
      }
    }),
  )
}

async function applyPresenceToConversations(list) {
  const ids = [...new Set(list.map(c => c.peerUserId).filter(Boolean))]
  if (!ids.length) {
    return
  }
  try {
    const res = await chatApi.presenceQuery(ids)
    const data = unwrapChatData(res)
    const users = data?.users ?? {}
    for (const c of list) {
      const p = c.peerUserId
      if (!p) {
        continue
      }
      const row = users[String(p)]
      if (row && typeof row.online === 'boolean') {
        c.online = row.online
      }
      if (row && row.lastSeenAt != null && Number.isFinite(Number(row.lastSeenAt))) {
        c.peerLastSeenAt = Number(row.lastSeenAt)
      }
      else if (row?.online === true) {
        c.peerLastSeenAt = null
      }
    }
  }
  catch (e) {
    console.error('presenceQuery', e)
  }
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

function onPresenceUpdate(payload) {
  const uid = payload?.userId != null ? String(payload.userId) : ''
  if (!uid) {
    return
  }
  const online = Boolean(payload?.online)
  const ls = payload?.lastSeenAt
  for (const c of conversations.value) {
    if (String(c.peerUserId) === uid) {
      c.online = online
      if (online) {
        c.peerLastSeenAt = null
      }
      else if (ls != null && Number.isFinite(Number(ls))) {
        c.peerLastSeenAt = Number(ls)
      }
    }
  }
}

function applyPeerHintsFromRoute() {
  const cid = route.query.conversationId
  const peerName = route.query.peerName
  const peerUsername = route.query.peerUsername
  if (!cid || !peerName) {
    return
  }
  const c = conversations.value.find(x => x.id === String(cid))
  if (c) {
    c.name = String(peerName)
    if (peerUsername) {
      c.username = String(peerUsername)
    }
  }
}

function mapApiMessageToUi(raw, myId) {
  let me
  if (typeof raw?.isOwn === 'boolean') {
    me = raw.isOwn
  }
  else {
    const sid = raw?.senderUserId
    me = myId != null && sid != null && String(sid) === String(myId)
  }
  const at = raw?.createdAt
    ? new Date(raw.createdAt)
    : raw?.updatedAt
      ? new Date(raw.updatedAt)
      : new Date()
  let text = raw?.text ?? ''
  if (!text && Array.isArray(raw?.attachments) && raw.attachments.length > 0) {
    text = '[Attachment]'
  }
  return {
    id: String(raw?.id ?? `msg-${Date.now()}`),
    text,
    me,
    at,
  }
}

function sortMessagesByTimeAsc(items) {
  return [...items].sort((a, b) => a.at.getTime() - b.at.getTime())
}

const MESSAGES_CHUNK_SIZE = 20

function nextMessagesCursorFromData(data) {
  if (!data || typeof data !== 'object') {
    return null
  }
  if (data.hasMore !== true) {
    return null
  }
  const c = data.nextCursor
  return c != null && String(c).length ? String(c) : null
}

const conversations = ref([])
const listFolder = ref('inbox')
const inboxUnreadTotal = ref(0)
const pendingUnreadTotal = ref(0)
let folderUnreadDebounceTimer = null
const listLoading = ref(false)
const messagesLoading = ref(false)
const loadingOlderMessages = ref(false)
const sendPending = ref(false)
const query = ref('')
const selectedId = ref(null)
const draft = ref('')
const mobileShowThread = ref(false)
const brokenAvatarIds = ref(new Set())

function markAvatarBroken(id) {
  const next = new Set(brokenAvatarIds.value)
  next.add(id)
  brokenAvatarIds.value = next
}

function isAvatarBroken(id) {
  return brokenAvatarIds.value.has(id)
}

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

const active = computed(() =>
  conversations.value.find(c => c.id === selectedId.value) ?? null,
)

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

const messagesScrollEl = ref(null)
const LOAD_OLDER_SCROLL_THRESHOLD_PX = 72

const lastReadWatermarkByConvId = new Map()
let readDebounceTimer = null
const READ_DEBOUNCE_MS = 520
const NEAR_BOTTOM_PX = 96

function isMessagesScrollNearBottom(el) {
  if (!el) {
    return false
  }
  return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX
}

function bumpConversationRowFromMessage(conv, raw, ui) {
  conv.lastMessage = ui.text
  conv.updatedAt = ui.at
  const rid = raw?.id
  if (rid != null) {
    conv.lastMessageId = String(rid)
  }
  conv.lastMessagePreview = {
    text: ui.text,
    senderUserId: raw?.senderUserId != null ? String(raw.senderUserId) : null,
  }
}

async function markConversationReadUpTo(conversationId, upToMessageId) {
  const conv = conversations.value.find(c => c.id === String(conversationId))
  if (!conv) {
    return
  }
  const mid = upToMessageId != null
    ? String(upToMessageId)
    : (conv.messages.length ? String(conv.messages[conv.messages.length - 1].id) : '')
  if (!mid) {
    return
  }
  if (lastReadWatermarkByConvId.get(conv.id) === mid) {
    return
  }
  try {
    const res = await chatApi.postRead(conv.id, { upToMessageId: mid })
    const data = unwrapChatData(res)
    if (typeof data?.readerUnreadCount === 'number') {
      conv.unreadCount = data.readerUnreadCount
    }
    mergeParticipantReceiptsFromEnvelope(conv, data)
    lastReadWatermarkByConvId.set(conv.id, mid)
    scheduleRefreshFolderUnreadTotals()
  }
  catch (e) {
    console.error('postRead', e)
  }
}

function scheduleMarkReadForOpenConversation(convId) {
  if (!convId || String(selectedId.value) !== String(convId)) {
    return
  }
  clearTimeout(readDebounceTimer)
  readDebounceTimer = setTimeout(() => {
    readDebounceTimer = null
    const c = conversations.value.find(x => x.id === String(convId))
    if (!c || String(selectedId.value) !== String(convId)) {
      return
    }
    const last = c.messages[c.messages.length - 1]
    if (!last) {
      return
    }
    markConversationReadUpTo(convId, last.id)
  }, READ_DEBOUNCE_MS)
}

function onMessagesScroll(e) {
  const el = e.target
  if (!el) {
    return
  }
  if (!loadingOlderMessages.value && active.value?.messagesNextCursor && el.scrollTop <= LOAD_OLDER_SCROLL_THRESHOLD_PX) {
    loadOlderMessages()
  }
  if (
    active.value
    && String(selectedId.value) === String(active.value.id)
    && isMessagesScrollNearBottom(el)
  ) {
    scheduleMarkReadForOpenConversation(active.value.id)
  }
}

function scrollMessagesToBottom() {
  nextTick(() => {
    const el = messagesScrollEl.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

const myUserId = computed(() => userStore.user?.id ?? null)

async function refreshFolderUnreadTotals() {
  try {
    const res = await chatApi.folderUnreadSummary()
    const data = unwrapChatData(res)
    const inbox = data?.inbox?.unreadTotal
    const pending = data?.pending?.unreadTotal
    if (typeof inbox === 'number') {
      inboxUnreadTotal.value = Math.max(0, inbox)
    }
    if (typeof pending === 'number') {
      pendingUnreadTotal.value = Math.max(0, pending)
    }
  }
  catch (e) {
    console.error('folderUnreadSummary', e)
  }
}

function scheduleRefreshFolderUnreadTotals() {
  clearTimeout(folderUnreadDebounceTimer)
  folderUnreadDebounceTimer = setTimeout(() => {
    folderUnreadDebounceTimer = null
    refreshFolderUnreadTotals()
  }, 320)
}

function onConversationRead(payload) {
  const cid = payload?.conversationId != null ? String(payload.conversationId) : ''
  if (!cid) {
    return
  }
  const conv = conversations.value.find(c => c.id === cid)
  if (!conv) {
    return
  }
  if (Array.isArray(payload?.participantReceipts)) {
    patchParticipantReceipts(conv, payload.participantReceipts)
  }
  else {
    const reader = payload?.readerUserId
    const upTo = payload?.upToMessageId
    if (reader != null && upTo != null && isMongoObjectIdString(upTo)) {
      patchParticipantReceipts(conv, [
        {
          userId: String(reader),
          lastReadMessageId: String(upTo),
          lastDeliveredMessageId: String(upTo),
        },
      ])
    }
  }
  const reader = payload?.readerUserId
  if (reader != null && myUserId.value != null && String(reader) === String(myUserId.value)) {
    const n = payload?.readerUnreadCount
    if (typeof n === 'number') {
      conv.unreadCount = n
    }
  }
  scheduleRefreshFolderUnreadTotals()
}

function onMessageNew(payload) {
  const conversationId = payload?.conversationId != null ? String(payload.conversationId) : ''
  const raw = payload?.message
  if (!conversationId || !raw) {
    return
  }
  const conv = conversations.value.find(c => c.id === conversationId)
  if (!conv) {
    scheduleRefreshFolderUnreadTotals()
    return
  }
  const mid = String(raw.id ?? '')
  if (mid && conv.messages.some(m => String(m.id) === mid)) {
    return
  }
  const ui = mapApiMessageToUi(raw, myUserId.value)
  conv.messages.push(ui)
  bumpConversationRowFromMessage(conv, raw, ui)

  const bump = payload?.unreadBumpForUserIds
  const my = myUserId.value
  const inBump = Array.isArray(bump) && my != null && bump.some(x => String(x) === String(my))
  const socketUnread
    = payload?.unreadCount ?? payload?.conversationUnreadCount ?? payload?.conversation?.unreadCount
  if (String(selectedId.value) !== conversationId) {
    if (typeof socketUnread === 'number') {
      conv.unreadCount = socketUnread
    }
    else if (inBump) {
      conv.unreadCount = (conv.unreadCount ?? 0) + 1
    }
  }
  else if (inBump) {
    scheduleMarkReadForOpenConversation(conversationId)
  }

  if (String(selectedId.value) === conversationId) {
    nextTick(() => scrollMessagesToBottom())
  }
  if (Array.isArray(payload?.participantReceipts)) {
    patchParticipantReceipts(conv, payload.participantReceipts)
  }
  scheduleRefreshFolderUnreadTotals()
}

let socketConnectJoin = () => {}

async function loadConversationList() {
  listLoading.value = true
  try {
    const res = await chatApi.listConversations({ folder: listFolder.value, limit: 20, page: 1 })
    const data = unwrapChatData(res)
    const rows = data?.conversations ?? []
    const my = userStore.user?.id
    conversations.value = rows.map(r => mapApiConversationToUi(r, my))
    await enrichAllConversationPeers(conversations.value)
    await applyPresenceToConversations(conversations.value)
    applyPeerHintsFromRoute()
    const qCid = route.query.conversationId
    if (qCid) {
      await ensureConversationInList(String(qCid))
      applyPeerHintsFromRoute()
      selectedId.value = String(qCid)
      mobileShowThread.value = true
      await router.replace({ path: '/chat' })
    }
    else if (selectedId.value && !conversations.value.some(c => c.id === String(selectedId.value))) {
      selectedId.value = null
      mobileShowThread.value = false
    }
  }
  catch (e) {
    console.error('loadConversationList', e)
    notification.error({
      message: 'Messages',
      description: e.response?.data?.message || 'Could not load conversations.',
    })
  }
  finally {
    listLoading.value = false
    await refreshFolderUnreadTotals()
  }
}

async function setListFolder(folder) {
  const f = folder === 'pending' ? 'pending' : 'inbox'
  if (listFolder.value === f) {
    return
  }
  listFolder.value = f
  selectedId.value = null
  mobileShowThread.value = false
  clearTimeout(readDebounceTimer)
  readDebounceTimer = null
  await loadConversationList()
}

async function ensureConversationInList(cid) {
  const c = conversations.value.find(x => x.id === String(cid))
  if (c) {
    return c
  }
  try {
    const res = await chatApi.getConversation(cid)
    const raw = unwrapChatData(res)
    const apiConv = raw?.conversation ?? raw
    if (!apiConv?.id) {
      return null
    }
    const ui = mapApiConversationToUi(apiConv, userStore.user?.id)
    conversations.value.unshift(ui)
    await enrichAllConversationPeers([ui])
    await applyPresenceToConversations([ui])
    return ui
  }
  catch (e) {
    console.error('getConversation', e)
    return null
  }
}

async function loadMessagesForConversation(cid) {
  const c = conversations.value.find(x => x.id === String(cid))
  if (!c || c.messagesLoaded) {
    return
  }
  messagesLoading.value = true
  try {
    const res = await chatApi.getMessages(cid, { chunkSize: MESSAGES_CHUNK_SIZE })
    const data = unwrapChatData(res)
    const rows = Array.isArray(data)
      ? data
      : (data?.messages ?? [])
    const my = userStore.user?.id
    const mapped = rows.map(m => mapApiMessageToUi(m, my))
    c.messages = sortMessagesByTimeAsc(mapped)
    c.messagesNextCursor = nextMessagesCursorFromData(data)
    mergeParticipantReceiptsFromEnvelope(c, data)
    c.messagesLoaded = true
  }
  catch (e) {
    console.error('getMessages', e)
    notification.error({
      message: 'Messages',
      description: e.response?.data?.message || 'Could not load messages.',
    })
  }
  finally {
    messagesLoading.value = false
  }
}

async function loadOlderMessages() {
  const c = active.value
  const el = messagesScrollEl.value
  if (!c?.messagesNextCursor || loadingOlderMessages.value) {
    return
  }
  const prevScrollHeight = el?.scrollHeight ?? 0
  const prevScrollTop = el?.scrollTop ?? 0
  loadingOlderMessages.value = true
  try {
    const res = await chatApi.getMessages(c.id, {
      chunkSize: MESSAGES_CHUNK_SIZE,
      cursor: c.messagesNextCursor,
    })
    const data = unwrapChatData(res)
    const rows = Array.isArray(data)
      ? data
      : (data?.messages ?? [])
    const my = userStore.user?.id
    const older = rows.map(m => mapApiMessageToUi(m, my))
    const byId = new Map()
    for (const m of [...older, ...c.messages]) {
      byId.set(String(m.id), m)
    }
    c.messages = sortMessagesByTimeAsc([...byId.values()])
    c.messagesNextCursor = nextMessagesCursorFromData(data)
    mergeParticipantReceiptsFromEnvelope(c, data)
    await nextTick()
    if (el) {
      el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop
    }
  }
  catch (e) {
    console.error('loadOlderMessages', e)
    notification.error({
      message: 'Messages',
      description: e.response?.data?.message || 'Could not load older messages.',
    })
  }
  finally {
    loadingOlderMessages.value = false
  }
}

watch(selectedId, async (id, oldId) => {
  receiptDetailForMessageId.value = null
  clearTimeout(readDebounceTimer)
  readDebounceTimer = null

  if (oldId != null && String(oldId) !== String(id ?? '')) {
    const prev = conversations.value.find(c => c.id === String(oldId))
    if (prev?.messages?.length) {
      const last = prev.messages[prev.messages.length - 1]
      await markConversationReadUpTo(prev.id, last.id)
    }
  }

  scrollMessagesToBottom()
  if (id) {
    await loadMessagesForConversation(String(id))
    emitRoomJoin(id)
    await nextTick()
    scrollMessagesToBottom()
    const c = active.value
    if (c?.messages?.length) {
      const last = c.messages[c.messages.length - 1]
      await markConversationReadUpTo(c.id, last.id)
    }
  }
})

onMounted(async () => {
  await userStore.fetchUserData()
  await loadConversationList()
  connectChatSocket()
  startPresenceHeartbeat()
  const s = getChatSocket()
  if (s) {
    s.on('message:new', onMessageNew)
    s.on('conversation:read', onConversationRead)
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
})

onUnmounted(() => {
  clearTimeout(folderUnreadDebounceTimer)
  folderUnreadDebounceTimer = null
  stopPresenceHeartbeat()
  const s = getChatSocket()
  if (s) {
    clearTimeout(readDebounceTimer)
    readDebounceTimer = null
    s.off('message:new', onMessageNew)
    s.off('conversation:read', onConversationRead)
    s.off('presence:update', onPresenceUpdate)
    s.off('connect', socketConnectJoin)
  }
  disconnectChatSocket()
})

function selectConversation(id) {
  selectedId.value = id
  mobileShowThread.value = true
}

function backToList() {
  mobileShowThread.value = false
}

async function send() {
  const text = draft.value.trim()
  if (!text || !active.value || sendPending.value) {
    return
  }
  sendPending.value = true
  try {
    const res = await chatApi.postMessage(active.value.id, { text })
    const data = unwrapChatData(res)
    const raw = data?.message ?? data
    const msg = mapApiMessageToUi(raw, myUserId.value)
    if (!active.value.messages.some(m => String(m.id) === String(msg.id))) {
      active.value.messages.push(msg)
    }
    active.value.lastMessageId = String(msg.id)
    active.value.lastMessagePreview = {
      text,
      senderUserId: myUserId.value != null ? String(myUserId.value) : null,
    }
    active.value.lastMessage = text
    active.value.updatedAt = msg.at
    mergeParticipantReceiptsFromEnvelope(active.value, data)
    draft.value = ''
    scrollMessagesToBottom()
  }
  catch (e) {
    console.error('postMessage', e)
    notification.error({
      message: 'Messages',
      description: e.response?.data?.message || 'Could not send message.',
    })
  }
  finally {
    sendPending.value = false
  }
}

function onComposerKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
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
</script>

<template>
  <div
    class="chat-page flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white font-sans text-[15px] leading-relaxed text-zinc-900 antialiased [-webkit-font-smoothing:antialiased]"
  >
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
                <div class="relative shrink-0">
                  <img
                    v-if="!isAvatarBroken(c.id)"
                    :src="c.peerAvatarUrl || avatarSrc(c.avatarSeed)"
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
              class="h-full min-h-0 flex-1 overflow-hidden"
              style="display:grid; grid-template-rows:auto minmax(0, 1fr) auto; height: 100%;"
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
                  <div class="relative h-12 w-12 shrink-0">
                    <img
                      v-if="!isAvatarBroken(active.id)"
                      :src="active.peerAvatarUrl || avatarSrc(active.avatarSeed)"
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
                </div>
              </div>

              <div
                ref="messagesScrollEl"
                class="chat-messages-scroll relative min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
                @scroll.passive="onMessagesScroll"
              >
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
                    :class="[
                      row.msg.me ? 'justify-end' : 'justify-start',
                      row.groupFirst && row.index > 0 ? 'mt-3' : row.groupFirst ? '' : 'mt-0.5'
                    ]"
                  >
                    <img
                      v-if="!row.msg.me && row.groupLast && !isAvatarBroken(active.id)"
                      :src="active.peerAvatarUrl || avatarSrc(active.avatarSeed)"
                      alt=""
                      width="28"
                      height="28"
                      class="mt-0.5 h-7 w-7 shrink-0 self-end rounded-full object-cover"
                      loading="lazy"
                      decoding="async"
                    >
                    <div
                      v-else-if="!row.msg.me && row.groupLast"
                      class="mt-0.5 flex h-7 w-7 shrink-0 self-end items-center justify-center rounded-full text-[10px] font-bold text-white"
                      :class="fallbackClass(active.id)"
                    >
                      {{ initials(active.name).slice(0, 1) }}
                    </div>
                    <div
                      v-else-if="!row.msg.me"
                      class="mt-0.5 w-7 shrink-0 self-end"
                      aria-hidden="true"
                    />
                    <div
                      class="max-w-[85%] sm:max-w-[70%]"
                      :class="row.msg.me ? 'flex flex-col items-end' : ''"
                    >
                      <div
                        class="px-3.5 py-2.5 text-[15px] leading-[1.45] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                        :class="
                          row.msg.me
                            ? [
                                row.groupLast ? 'rounded-[18px] rounded-br-[4px]' : 'rounded-[18px]',
                                'bg-[#1877f2] text-white cursor-pointer active:opacity-95'
                              ]
                            : [
                                row.groupLast ? 'rounded-[18px] rounded-bl-[4px]' : 'rounded-[18px]',
                                'border border-zinc-200/80 bg-white text-zinc-800'
                              ]
                        "
                        @click.stop="row.msg.me && toggleOutgoingReceiptDetail(row.msg.id)"
                      >
                        <p class="whitespace-pre-wrap break-words">
                          {{ row.msg.text }}
                        </p>
                      </div>
                      <p
                        v-if="row.showMeta"
                        class="mt-1 flex flex-wrap items-center gap-x-1.5 px-1.5 text-[11px] text-zinc-400"
                        :class="row.msg.me ? 'justify-end text-right' : 'text-left'"
                      >
                        <span>{{ timeLabel(row.msg.at) }}</span>
                        <span
                          v-if="row.msg.me && shouldShowOutgoingReceipt(active.messages, row.msg.id, active) && outgoingMessageReceiptLabel(active, row.msg.id)"
                        >· {{ outgoingMessageReceiptLabel(active, row.msg.id) }}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="border-t border-zinc-200 bg-white px-4 py-3 sm:px-5">
                <form @submit.prevent="send">
                  <div
                    class="composer-bar flex min-h-[48px] items-center gap-1.5 rounded-full border border-zinc-200/90 bg-[#f0f2f5] py-1.5 pl-2.5 pr-2 transition focus-within:border-[#1877f2]/35 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(24,119,242,0.12)]"
                  >
                    <button
                      type="button"
                      class="composer-icon-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-[#1877f2]"
                      aria-label="Attach"
                    >
                      <i class="fa-solid fa-plus text-[18px] leading-none" />
                    </button>
                    <textarea
                      v-model="draft"
                      rows="1"
                      placeholder="Message"
                      autocomplete="off"
                      class="min-h-[40px] max-h-28 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2.5 align-middle text-[15px] leading-[1.35] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
                      @keydown="onComposerKeydown"
                    />
                    <button
                      type="submit"
                      class="composer-send flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-[14px] text-white shadow-sm transition hover:bg-[#166fe5] active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#e4e6eb] disabled:text-[#bcc0c4] disabled:shadow-none"
                      :disabled="!draft.trim() || sendPending"
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
