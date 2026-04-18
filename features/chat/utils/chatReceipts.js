import {
  isMongoObjectIdString,
  maxWatermarkId,
  messageIdAtOrBeforeWatermark
} from '~/features/chat/utils/chatObjectId.js'

export function normalizeParticipantReceipts(list) {
  if (!Array.isArray(list)) {
    return []
  }
  return list.map((r) => {
    const read = r.lastReadMessageId ?? r.lastReadUpToMessageId ?? r.readUpToMessageId ?? null
    return {
      userId: String(r.userId),
      lastDeliveredMessageId: r.lastDeliveredMessageId != null ? String(r.lastDeliveredMessageId) : null,
      lastReadMessageId: read != null ? String(read) : null,
      updatedAt: r.updatedAt
    }
  })
}

export function patchParticipantReceipts(conv, receipts) {
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
    } else {
      byUser.set(uid, {
        userId: uid,
        lastDeliveredMessageId: maxWatermarkId(prev.lastDeliveredMessageId, r.lastDeliveredMessageId),
        lastReadMessageId: maxWatermarkId(prev.lastReadMessageId, r.lastReadMessageId),
        updatedAt: r.updatedAt ?? prev.updatedAt
      })
    }
  }
  conv.participantReceipts = [...byUser.values()]
}

export function mergeParticipantReceiptsFromEnvelope(conv, data) {
  if (!conv || !data || typeof data !== 'object') {
    return
  }
  if (Array.isArray(data.participantReceipts)) {
    patchParticipantReceipts(conv, data.participantReceipts)
  }
}

export function peerReceiptForConversation(conv, myUserId) {
  if (!conv?.participantReceipts?.length || myUserId == null) {
    return null
  }
  return conv.participantReceipts.find(r => String(r.userId) !== String(myUserId)) ?? null
}

export function outgoingMessageReceiptLabel(conv, messageId, myUserId) {
  if (!conv || conv.type !== 'direct' || !isMongoObjectIdString(messageId)) {
    return ''
  }
  const peer = peerReceiptForConversation(conv, myUserId)
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
