import { normalizeParticipantReceipts } from '~/features/chat/utils/chatReceipts.js'

export const MESSAGES_CHUNK_SIZE = 20

export function peerUserIdFromParticipants(participants, myUserId) {
  if (!Array.isArray(participants) || myUserId == null) {
    return ''
  }
  const mine = String(myUserId)
  const other = participants.find(p => String(p.userId) !== mine)
  return other?.userId != null ? String(other.userId) : ''
}

export function normalizeLastPreviewObject(p) {
  if (p == null) {
    return null
  }
  if (typeof p === 'string') {
    return { text: p, senderUserId: null }
  }
  return {
    text: p.text ?? '',
    senderUserId: p.senderUserId != null ? String(p.senderUserId) : null
  }
}

export function lastPreviewText(apiConv) {
  const p = apiConv.lastMessagePreview
  if (p == null) {
    return ''
  }
  if (typeof p === 'string') {
    return p
  }
  return p.text ?? ''
}

export function mapApiConversationToUi(apiConv, myUserIdVal) {
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
    participantReceipts: normalizeParticipantReceipts(apiConv.participantReceipts),
    pinnedMessages: Array.isArray(apiConv.pinnedMessages) ? apiConv.pinnedMessages : []
  }
}

export function mapApiMessageToUi(raw, myId) {
  let me
  if (typeof raw?.isOwn === 'boolean') {
    me = raw.isOwn
  } else {
    const sid = raw?.senderUserId
    me = myId != null && sid != null && String(sid) === String(myId)
  }
  const senderUserId = raw?.senderUserId != null ? String(raw.senderUserId) : ''
  const at = raw?.createdAt
    ? new Date(raw.createdAt)
    : raw?.updatedAt
      ? new Date(raw.updatedAt)
      : new Date()
  let imageUrl = ''
  if (Array.isArray(raw?.attachments)) {
    for (const a of raw.attachments) {
      const u = typeof a.url === 'string' ? a.url.trim() : ''
      if (u && (a.kind === 'image' || a.objectKey)) {
        imageUrl = u
        break
      }
    }
  }
  let text = raw?.text ?? ''
  const metadata = raw?.metadata && typeof raw.metadata === 'object' ? raw.metadata : null
  const isSticker = metadata?.kind === 'sticker'
  const stickerUrl = typeof metadata?.stickerUrl === 'string' ? metadata.stickerUrl.trim() : ''
  const recalledAt = raw?.recalledAt ?? null
  const recalledByUserId = raw?.recalledByUserId != null ? String(raw.recalledByUserId) : null
  const isRecalled = Boolean(recalledAt)
  if (isRecalled) {
    text = ''
    imageUrl = ''
  }
  if (imageUrl && (!text || text === '[Attachment]' || text === '[đính kèm]')) {
    text = ''
  } else if (!text && Array.isArray(raw?.attachments) && raw.attachments.length > 0 && !imageUrl) {
    text = '[Attachment]'
  }
  if (isSticker && !text) {
    text = '[Sticker]'
  }
  return {
    id: String(raw?.id ?? `msg-${Date.now()}`),
    senderUserId,
    type: raw?.type === 'system' ? 'system' : 'text',
    text,
    imageUrl,
    isSticker,
    stickerUrl,
    me,
    at,
    metadata,
    recalledAt,
    recalledByUserId,
    replyToMessageId: raw?.replyToMessageId != null ? String(raw.replyToMessageId) : null,
    replyPreview: raw?.replyPreview ?? null
  }
}

export function sortMessagesByTimeAsc(items) {
  return [...items].sort((a, b) => a.at.getTime() - b.at.getTime())
}

export function nextMessagesCursorFromData(data) {
  if (!data || typeof data !== 'object') {
    return null
  }
  if (data.hasMore !== true) {
    return null
  }
  const c = data.nextCursor
  return c != null && String(c).length ? String(c) : null
}

export function rowPreviewFromMessageUi(raw, ui) {
  if (ui?.metadata?.kind === 'sticker') {
    return '[sticker]'
  }
  const t = typeof ui.text === 'string' ? ui.text.trim() : ''
  if (t) {
    return t
  }
  const hasImg = Boolean(ui.imageUrl)
    || (Array.isArray(raw?.attachments)
      && raw.attachments.some(
        a => a && (a.kind === 'image' || (typeof a.objectKey === 'string' && a.objectKey))
      ))
  return hasImg ? '[đính kèm]' : ''
}

export function bumpConversationRowFromMessage(conv, raw, ui) {
  const preview = rowPreviewFromMessageUi(raw, ui)
  conv.lastMessage = preview
  conv.updatedAt = ui.at
  const rid = raw?.id
  if (rid != null) {
    conv.lastMessageId = String(rid)
  }
  conv.lastMessagePreview = {
    text: preview,
    senderUserId: raw?.senderUserId != null ? String(raw.senderUserId) : null
  }
}

export function lastOwnUiMessageId(messages) {
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
