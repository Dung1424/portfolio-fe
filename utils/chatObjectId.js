/**
 * MongoDB ObjectId string helpers (24 hex chars).
 */

export function compareMongoObjectIdHex(a, b) {
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

export function isMongoObjectIdString(id) {
  const s = String(id ?? '')
  return s.length === 24 && /^[0-9a-f]{24}$/i.test(s)
}

export function messageIdAtOrBeforeWatermark(messageId, watermarkId) {
  if (!messageId || !watermarkId) {
    return false
  }
  return compareMongoObjectIdHex(messageId, watermarkId) <= 0
}

export function maxWatermarkId(a, b) {
  if (!a) {
    return b ?? null
  }
  if (!b) {
    return a
  }
  return compareMongoObjectIdHex(a, b) >= 0 ? a : b
}
