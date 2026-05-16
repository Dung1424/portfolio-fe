import { computed, nextTick, ref, unref } from 'vue'
import { notification } from 'ant-design-vue'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import {
  mergeParticipantReceiptsFromEnvelope,
  patchParticipantReceipts
} from '~/features/chat/utils/chatReceipts.js'
import { compareMongoObjectIdHex, isMongoObjectIdString, messageIdAtOrBeforeWatermark } from '~/features/chat/utils/chatObjectId.js'
import {
  MESSAGES_CHUNK_SIZE,
  bumpConversationRowFromMessage,
  lastPreviewText,
  mapApiMessageToUi,
  nextMessagesCursorFromData,
  normalizeLastPreviewObject,
  sortMessagesByTimeAsc
} from '~/features/chat/utils/chatMappers.js'

/**
 * @param {import('vue').Ref<unknown[]>} conversations
 * @param {import('vue').Ref<string | null>} selectedId
 * @param {import('vue').Ref<boolean>} _mobileShowThread
 * @param {import('vue').ComputedRef<string | null>} myUserId
 * @param {() => void} scheduleRefreshFolderUnreadTotals
 * @param {(isIncoming: boolean, conversationId: string) => void} maybePlayIncomingNotify
 */
export function useChatMessaging(
  conversations,
  selectedId,
  _mobileShowThread,
  myUserId,
  scheduleRefreshFolderUnreadTotals,
  maybePlayIncomingNotify
) {
  const messagesLoading = ref(false)
  const loadingOlderMessages = ref(false)
  const sendPending = ref(false)
  const draft = ref('')
  const replyTo = ref(null)
  const pendingChatImage = ref(null)
  const pendingChatFile = ref(null)
  const messagesScrollEl = ref(null)
  const highlightedMessageId = ref(null)
  let highlightedTimer = null

  const LOAD_OLDER_SCROLL_THRESHOLD_PX = 72
  const lastReadWatermarkByConvId = new Map()
  let readDebounceTimer = null
  const READ_DEBOUNCE_MS = 520
  const NEAR_BOTTOM_PX = 96

  const active = computed(() =>
    conversations.value.find(c => c.id === selectedId.value) ?? null
  )

  /**
   * Mỗi người xem chỉ một avatar: trên **tin mới nhất trong thread** (mọi người gửi)
   * có id ≤ lastReadMessageId của họ — đúng với “đọc tới đâu” trong hội thoại,
   * không kẹt ở tin cuối của **chính viewer** khi người khác đã nhắn tin mới hơn.
   */
  function refreshGroupSeenAvatarsOnConv(conv) {
    const my = unref(myUserId)
    if (!conv?.isGroup || !Array.isArray(conv.messages) || my == null) {
      return
    }
    const receipts = Array.isArray(conv.participantReceipts) ? conv.participantReceipts : []
    const myS = String(my)
    for (const m of conv.messages) {
      m.groupSeenByUserIds = []
    }
    for (const r of receipts) {
      const rid = r?.userId != null ? String(r.userId) : ''
      if (!rid || rid === myS) {
        continue
      }
      const lr = r.lastReadMessageId
      if (!lr) {
        continue
      }
      const lrS = String(lr)
      for (let i = conv.messages.length - 1; i >= 0; i--) {
        const m = conv.messages[i]
        if (m.recalledAt || m.type === 'system') {
          continue
        }
        const mid = String(m.id)
        if (messageIdAtOrBeforeWatermark(mid, lrS)) {
          if (!Array.isArray(m.groupSeenByUserIds)) {
            m.groupSeenByUserIds = []
          }
          if (!m.groupSeenByUserIds.includes(rid)) {
            m.groupSeenByUserIds.push(rid)
          }
          break
        }
      }
    }
  }

  function clearReadDebounceTimer() {
    clearTimeout(readDebounceTimer)
    readDebounceTimer = null
  }

  function isMessagesScrollNearBottom(el) {
    if (!el) {
      return false
    }
    return el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM_PX
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
      refreshGroupSeenAvatarsOnConv(conv)
      lastReadWatermarkByConvId.set(conv.id, mid)
      scheduleRefreshFolderUnreadTotals()
    } catch (e) {
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

  async function refreshPinnedMessages(cid) {
    const c = conversations.value.find(x => x.id === String(cid))
    if (!c) {
      return
    }
    const wasGroupViewerOut = c.type === 'group' && Boolean(c.viewerHasLeft)
    try {
      const res = await chatApi.getConversation(cid)
      const d = unwrapChatData(res)
      c.pinnedMessages = Array.isArray(d.pinnedMessages) ? d.pinnedMessages : []
      if (d?.type === 'group') {
        const gn = typeof d.groupName === 'string' ? d.groupName.trim() : ''
        if (gn) {
          c.groupName = gn
          c.name = gn
        }
        if (typeof d.groupAvatarUrl === 'string' && d.groupAvatarUrl) {
          c.groupAvatarUrl = d.groupAvatarUrl
          c.peerAvatarUrl = d.groupAvatarUrl
        }
        if (typeof d.adminUserId === 'string') {
          c.adminUserId = d.adminUserId
        }
        c.viewerRole = d.viewerRole ?? c.viewerRole
        c.viewerHasLeft = Boolean(d.viewerHasLeft)
        c.viewerRemovedByAdmin = Boolean(d.viewerRemovedByAdmin)
        c.viewerHistoryVisibleUpToMessageId = d.viewerHistoryVisibleUpToMessageId != null
          ? String(d.viewerHistoryVisibleUpToMessageId)
          : null
        c.canSendMessages = d.canSendMessages !== false
        if (d.lastMessageId != null) {
          c.lastMessageId = String(d.lastMessageId)
        }
        if (d.lastMessagePreview !== undefined) {
          c.lastMessagePreview = normalizeLastPreviewObject(d.lastMessagePreview)
          c.lastMessage = lastPreviewText({ lastMessagePreview: d.lastMessagePreview })
        }
        if (d.lastMessageAt) {
          c.updatedAt = new Date(d.lastMessageAt)
        }
        if (Array.isArray(d.participants)) {
          c.participants = d.participants
        }
        const cap = d.viewerHistoryVisibleUpToMessageId != null
          ? String(d.viewerHistoryVisibleUpToMessageId)
          : ''
        if (cap && Array.isArray(c.messages) && c.messages.length) {
          c.messages = c.messages.filter(
            m => m?.id != null && compareMongoObjectIdHex(String(m.id), cap) <= 0
          )
        }
        /**
         * Trước đây đã rời / bị xóa: UI chỉ giữ tin tới mốc. Khi được mời lại,
         * phải tải lại thread — không thì thiếu mọi tin gửi trong lúc không trong nhóm.
         */
        const rejoinedGroup = wasGroupViewerOut && d.viewerHasLeft === false
        if (rejoinedGroup) {
          c.messagesLoaded = false
          c.messages = []
          c.messagesNextCursor = null
          if (String(selectedId.value) === String(cid)) {
            await loadMessagesForConversation(cid)
          }
        }
      }
    } catch (e) {
      console.error('getConversation (pins)', e)
    }
  }

  function onConversationPinsUpdated(payload) {
    const cid = payload?.conversationId != null ? String(payload.conversationId) : ''
    if (!cid) {
      return
    }
    const conv = conversations.value.find(x => x.id === cid)
    if (!conv) {
      return
    }
    conv.pinnedMessages = Array.isArray(payload.pinnedMessages)
      ? payload.pinnedMessages
      : []
  }

  async function loadMessagesForConversation(cid) {
    const c = conversations.value.find(x => x.id === String(cid))
    if (!c || c.messagesLoaded) {
      return
    }
    messagesLoading.value = true
    try {
      const my = unref(myUserId)
      const res = await chatApi.getMessages(cid, { chunkSize: MESSAGES_CHUNK_SIZE })
      const data = unwrapChatData(res)
      const rows = Array.isArray(data)
        ? data
        : (data?.messages ?? [])
      const mapped = rows.map(m => mapApiMessageToUi(m, my))
      c.messages = sortMessagesByTimeAsc(mapped)
      c.messagesNextCursor = nextMessagesCursorFromData(data)
      mergeParticipantReceiptsFromEnvelope(c, data)
      refreshGroupSeenAvatarsOnConv(c)
      c.messagesLoaded = true
    } catch (e) {
      console.error('getMessages', e)
      notification.error({
        message: 'Messages',
        description: e.response?.data?.message || 'Could not load messages.'
      })
    } finally {
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
        cursor: c.messagesNextCursor
      })
      const data = unwrapChatData(res)
      const rows = Array.isArray(data)
        ? data
        : (data?.messages ?? [])
      const my = unref(myUserId)
      const older = rows.map(m => mapApiMessageToUi(m, my))
      const byId = new Map()
      for (const m of [...older, ...c.messages]) {
        byId.set(String(m.id), m)
      }
      c.messages = sortMessagesByTimeAsc([...byId.values()])
      c.messagesNextCursor = nextMessagesCursorFromData(data)
      mergeParticipantReceiptsFromEnvelope(c, data)
      refreshGroupSeenAvatarsOnConv(c)
      await nextTick()
      if (el) {
        el.scrollTop = el.scrollHeight - prevScrollHeight + prevScrollTop
      }
    } catch (e) {
      console.error('loadOlderMessages', e)
      notification.error({
        message: 'Messages',
        description: e.response?.data?.message || 'Could not load older messages.'
      })
    } finally {
      loadingOlderMessages.value = false
    }
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
      mergeParticipantReceiptsFromEnvelope(conv, payload)
    } else {
      const reader = payload?.readerUserId
      const upTo = payload?.upToMessageId
      if (reader != null && upTo != null && isMongoObjectIdString(upTo)) {
        patchParticipantReceipts(conv, [
          {
            userId: String(reader),
            lastReadMessageId: String(upTo),
            lastDeliveredMessageId: String(upTo)
          }
        ])
      }
    }
    const reader = payload?.readerUserId
    const my = unref(myUserId)
    if (reader != null && my != null && String(reader) === String(my)) {
      const n = payload?.readerUnreadCount
      if (typeof n === 'number') {
        conv.unreadCount = n
      }
    }
    refreshGroupSeenAvatarsOnConv(conv)
    scheduleRefreshFolderUnreadTotals()
  }

  function onMessageNew(payload) {
    const conversationId = payload?.conversationId != null ? String(payload.conversationId) : ''
    const raw = payload?.message
    if (!conversationId || !raw) {
      return
    }
    const my = unref(myUserId)
    const isIncoming
      = my != null && String(raw?.senderUserId ?? '') !== String(my)
    const isSelectedConversation = String(selectedId.value) === conversationId
    const nearBottomBeforeInsert = isSelectedConversation
      ? isMessagesScrollNearBottom(messagesScrollEl.value)
      : false

    const conv = conversations.value.find(c => c.id === conversationId)
    if (!conv) {
      maybePlayIncomingNotify(isIncoming, conversationId)
      scheduleRefreshFolderUnreadTotals()
      return
    }
    const mid = String(raw.id ?? '')
    if (mid && conv.viewerHistoryVisibleUpToMessageId) {
      const cap = String(conv.viewerHistoryVisibleUpToMessageId)
      if (compareMongoObjectIdHex(mid, cap) > 0) {
        scheduleRefreshFolderUnreadTotals()
        return
      }
    }
    if (mid && conv.messages.some(m => String(m.id) === mid)) {
      return
    }
    const ui = mapApiMessageToUi(raw, my)
    conv.messages.push(ui)
    bumpConversationRowFromMessage(conv, raw, ui)
    if (!conv.notificationMuted) {
      maybePlayIncomingNotify(isIncoming, conversationId)
    }

    const bump = payload?.unreadBumpForUserIds
    const inBump = Array.isArray(bump) && my != null && bump.some(x => String(x) === String(my))
    const socketUnread
      = payload?.unreadCount ?? payload?.conversationUnreadCount ?? payload?.conversation?.unreadCount
    if (String(selectedId.value) !== conversationId) {
      if (typeof socketUnread === 'number') {
        conv.unreadCount = socketUnread
      } else if (inBump) {
        conv.unreadCount = (conv.unreadCount ?? 0) + 1
      }
    } else if (inBump) {
      scheduleMarkReadForOpenConversation(conversationId)
    }

    if (isSelectedConversation && (!isIncoming || nearBottomBeforeInsert)) {
      nextTick(() => scrollMessagesToBottom())
    }
    if (Array.isArray(payload?.participantReceipts)) {
      patchParticipantReceipts(conv, payload.participantReceipts)
    }
    refreshGroupSeenAvatarsOnConv(conv)
    scheduleRefreshFolderUnreadTotals()
  }

  function onMessageUpdated(payload) {
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
    if (!mid) {
      return
    }
    const my = unref(myUserId)
    const ui = mapApiMessageToUi(raw, my)
    const idx = conv.messages.findIndex(m => String(m.id) === mid)
    if (idx >= 0) {
      conv.messages[idx] = { ...conv.messages[idx], ...ui }
    }
    if (String(conv.lastMessageId ?? '') === mid && ui.recalledAt) {
      conv.lastMessage = 'Tin nhắn đã được thu hồi'
      conv.lastMessagePreview = {
        text: conv.lastMessage,
        senderUserId: raw?.senderUserId != null ? String(raw.senderUserId) : null,
        messageType: 'text'
      }
    }
    scheduleRefreshFolderUnreadTotals()
  }

  function clearPendingChatImage() {
    const p = pendingChatImage.value
    if (p?.previewUrl && String(p.previewUrl).startsWith('blob:')) {
      URL.revokeObjectURL(p.previewUrl)
    }
    pendingChatImage.value = null
  }

  function clearPendingChatFile() {
    pendingChatFile.value = null
  }

  function startReplyToMessage(msg) {
    if (!msg?.id) {
      replyTo.value = null
      return
    }
    replyTo.value = {
      id: String(msg.id),
      text: typeof msg.text === 'string' ? msg.text : '',
      imageUrl: typeof msg.imageUrl === 'string' ? msg.imageUrl : '',
      me: Boolean(msg.me),
      at: msg.at ?? null,
      senderUserId: msg.senderUserId != null ? String(msg.senderUserId) : null
    }
  }

  function clearReplyToMessage() {
    replyTo.value = null
  }

  function clearHighlightedTimer() {
    if (highlightedTimer) {
      clearTimeout(highlightedTimer)
      highlightedTimer = null
    }
  }

  function scrollToMessageIdOnce(messageId) {
    const el = messagesScrollEl.value
    if (!el) return false
    const target = el.querySelector(`[data-message-id="${CSS.escape(String(messageId))}"]`)
    if (!target) return false
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    highlightedMessageId.value = String(messageId)
    clearHighlightedTimer()
    highlightedTimer = setTimeout(() => {
      highlightedTimer = null
      if (String(highlightedMessageId.value ?? '') === String(messageId)) {
        highlightedMessageId.value = null
      }
    }, 2200)
    return true
  }

  async function jumpToMessage(messageId) {
    const cid = active.value?.id
    if (!cid || !messageId) {
      return
    }
    const id = String(messageId)
    if (active.value?.messages?.some(m => String(m.id) === id)) {
      nextTick(() => scrollToMessageIdOnce(id))
      return
    }
    try {
      const res = await chatApi.getMessagesAround(cid, id, { before: 25, after: 12 })
      const data = unwrapChatData(res)
      const rows = Array.isArray(data?.messages) ? data.messages : (Array.isArray(data) ? data : [])
      const my = unref(myUserId)
      const mapped = rows.map(m => mapApiMessageToUi(m, my))
      const byId = new Map()
      for (const m of [...(active.value?.messages ?? []), ...mapped]) {
        byId.set(String(m.id), m)
      }
      if (active.value) {
        active.value.messages = sortMessagesByTimeAsc([...byId.values()])
        active.value.messagesLoaded = true
        mergeParticipantReceiptsFromEnvelope(active.value, data)
        refreshGroupSeenAvatarsOnConv(active.value)
      }
      await nextTick()
      scrollToMessageIdOnce(id)
    } catch (e) {
      console.error('jumpToMessage', e)
      notification.error({
        message: 'Reply',
        description: e.response?.data?.message || 'Could not locate the original message.'
      })
    }
  }

  async function onChatImageSelected(ev) {
    const input = ev.target
    const file = input.files?.[0]
    input.value = ''
    if (!file || !active.value) {
      return
    }
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!allowed.includes(file.type)) {
      notification.error({
        message: 'Photo',
        description: 'Chọn JPEG, PNG, GIF hoặc WebP.'
      })
      return
    }
    try {
      const res = await chatApi.presignChatImageUpload(active.value.id, {
        contentType: file.type,
        fileName: file.name
      })
      const presign = unwrapChatData(res)
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      })
      if (!put.ok) {
        throw new Error(`Upload ${put.status}`)
      }
      clearPendingChatImage()
      clearPendingChatFile()
      pendingChatImage.value = {
        objectKey: presign.objectKey,
        previewUrl: URL.createObjectURL(file)
      }
    } catch (e) {
      console.error('chat image upload', e)
      const apiMsg = e?.response?.data?.message
      const apiErr = Array.isArray(e?.response?.data?.errors)
        ? e.response.data.errors[0]
        : null
      notification.error({
        message: 'Photo',
        description:
          apiMsg
          || apiErr
          || e?.message
          || 'Could not upload image (MinIO / CORS / network).'
      })
    }
  }

  async function onChatFileSelected(ev) {
    const input = ev.target
    const file = input.files?.[0]
    input.value = ''
    if (!file || !active.value) {
      return
    }
    const ext = String(file.name || '').split('.').pop()?.toLowerCase() || ''
    const allowed = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'mp4', 'mov']
    const isVideo = ['mp4', 'mov'].includes(ext)
    const maxBytes = isVideo ? 200 * 1024 * 1024 : 25 * 1024 * 1024
    if (!allowed.includes(ext)) {
      notification.error({
        message: 'File',
        description: 'Chỉ gửi Word, Excel, PowerPoint, MP4 hoặc MOV.'
      })
      return
    }
    if (file.size > maxBytes) {
      notification.error({
        message: 'File quá lớn',
        description: `Dung lượng tối đa là ${isVideo ? '200MB' : '25MB'}.`
      })
      return
    }
    try {
      const res = await chatApi.presignChatFileUpload(active.value.id, {
        contentType: file.type || 'application/octet-stream',
        fileName: file.name,
        size: file.size
      })
      const presign = unwrapChatData(res)
      const put = await fetch(presign.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: presign.headers || { 'Content-Type': file.type || 'application/octet-stream' }
      })
      if (!put.ok) {
        throw new Error(`Upload ${put.status}`)
      }
      clearPendingChatImage()
      clearPendingChatFile()
      pendingChatFile.value = presign.attachment
    } catch (e) {
      console.error('chat file upload', e)
      notification.error({
        message: 'File',
        description: e?.response?.data?.message || e?.message || 'Không upload được file.'
      })
    }
  }

  async function send(unlockNotifyAudio, options = {}) {
    const text = draft.value.trim()
    const pending = pendingChatImage.value
    const pendingFile = pendingChatFile.value
    const sticker = options?.sticker && typeof options.sticker === 'object'
      ? options.sticker
      : null
    if ((!text && !pending && !pendingFile && !sticker) || !active.value || sendPending.value) {
      return
    }
    if (typeof unlockNotifyAudio === 'function') {
      unlockNotifyAudio()
    }
    sendPending.value = true
    try {
      const body = {}
      if (text) {
        body.text = text
      }
      if (pending) {
        body.attachments = [{ kind: 'image', objectKey: pending.objectKey }]
      }
      if (pendingFile) {
        body.attachments = [pendingFile]
      }
      if (sticker) {
        body.text = text || '[Sticker]'
        body.metadata = {
          kind: 'sticker',
          stickerId: String(sticker.id || ''),
          stickerPack: String(sticker.pack || ''),
          stickerUrl: String(sticker.url || '')
        }
      }
      if (replyTo.value?.id) {
        body.replyToMessageId = String(replyTo.value.id)
      }
      const res = await chatApi.postMessage(active.value.id, body)
      const data = unwrapChatData(res)
      const raw = data?.message ?? data
      const msg = mapApiMessageToUi(raw, unref(myUserId))
      if (!active.value.messages.some(m => String(m.id) === String(msg.id))) {
        active.value.messages.push(msg)
      }
      active.value.lastMessageId = String(msg.id)
      const previewText = sticker ? '[sticker]' : (text || (pendingFile ? '[file]' : (pending ? '[đính kèm]' : '')))
      const uid = unref(myUserId)
      active.value.lastMessagePreview = {
        text: previewText,
        senderUserId: uid != null ? String(uid) : null,
        messageType: 'text'
      }
      active.value.lastMessage = previewText
      active.value.updatedAt = msg.at
      mergeParticipantReceiptsFromEnvelope(active.value, data)
      refreshGroupSeenAvatarsOnConv(active.value)
      draft.value = ''
      clearPendingChatImage()
      clearPendingChatFile()
      clearReplyToMessage()
      scrollMessagesToBottom()
    } catch (e) {
      console.error('postMessage', e)
      notification.error({
        message: 'Messages',
        description: e.response?.data?.message || 'Could not send message.'
      })
    } finally {
      sendPending.value = false
    }
  }

  function sendSticker(sticker, unlockNotifyAudio) {
    if (!sticker || !sticker.url) {
      return
    }
    return send(unlockNotifyAudio, { sticker })
  }

  return {
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
    loadOlderMessages,
    onConversationRead,
    onMessageNew,
    onMessageUpdated,
    onConversationPinsUpdated,
    refreshPinnedMessages,
    clearPendingChatImage,
    clearPendingChatFile,
    startReplyToMessage,
    clearReplyToMessage,
    jumpToMessage,
    onChatImageSelected,
    onChatFileSelected,
    send,
    sendSticker
  }
}
