import { computed, nextTick, ref, unref } from 'vue'
import { notification } from 'ant-design-vue'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import {
  mergeParticipantReceiptsFromEnvelope,
  patchParticipantReceipts
} from '~/utils/chatReceipts.js'
import { isMongoObjectIdString } from '~/utils/chatObjectId.js'
import {
  MESSAGES_CHUNK_SIZE,
  bumpConversationRowFromMessage,
  mapApiMessageToUi,
  nextMessagesCursorFromData,
  sortMessagesByTimeAsc
} from '~/utils/chatMappers.js'

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
  const chatImageInputRef = ref(null)
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
    try {
      const res = await chatApi.getConversation(cid)
      const d = unwrapChatData(res)
      c.pinnedMessages = Array.isArray(d.pinnedMessages) ? d.pinnedMessages : []
    }
    catch (e) {
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
      patchParticipantReceipts(conv, payload.participantReceipts)
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
    if (mid && conv.messages.some(m => String(m.id) === mid)) {
      return
    }
    const ui = mapApiMessageToUi(raw, my)
    conv.messages.push(ui)
    bumpConversationRowFromMessage(conv, raw, ui)
    maybePlayIncomingNotify(isIncoming, conversationId)

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
      senderUserId: msg.senderUserId != null ? String(msg.senderUserId) : null,
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

  function openChatImagePicker() {
    chatImageInputRef.value?.click()
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

  async function send(unlockNotifyAudio, options = {}) {
    const text = draft.value.trim()
    const pending = pendingChatImage.value
    const sticker = options?.sticker && typeof options.sticker === 'object'
      ? options.sticker
      : null
    if ((!text && !pending && !sticker) || !active.value || sendPending.value) {
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
      if (sticker) {
        body.text = text || '[Sticker]'
        body.metadata = {
          kind: 'sticker',
          stickerId: String(sticker.id || ''),
          stickerPack: String(sticker.pack || ''),
          stickerUrl: String(sticker.url || ''),
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
      const previewText = sticker ? '[sticker]' : (text || (pending ? '[đính kèm]' : ''))
      const uid = unref(myUserId)
      active.value.lastMessagePreview = {
        text: previewText,
        senderUserId: uid != null ? String(uid) : null
      }
      active.value.lastMessage = previewText
      active.value.updatedAt = msg.at
      mergeParticipantReceiptsFromEnvelope(active.value, data)
      draft.value = ''
      clearPendingChatImage()
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
    loadOlderMessages,
    onConversationRead,
    onMessageNew,
    onMessageUpdated,
    onConversationPinsUpdated,
    refreshPinnedMessages,
    clearPendingChatImage,
    startReplyToMessage,
    clearReplyToMessage,
    jumpToMessage,
    openChatImagePicker,
    onChatImageSelected,
    send,
    sendSticker
  }
}
