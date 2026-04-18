import { ref, watch, onUnmounted } from 'vue'
import type { Ref } from 'vue'
import {
  getChatSocket,
  emitConversationTyping,
  onChatSocketReady
} from '~/services/chatSocket.js'

const PEER_TYPING_IDLE_MS = 3000

type TypingPayload = {
  conversationId?: string
  userId?: string
  typing?: boolean
}

/**
 * Realtime "dang nhap": lang nghe `typing:update`, gui bang `setTyping`.
 * Khong dung Vue ref trong chatSocket.js (tranh loi Nuxt/SSR).
 */
export function useConversationTyping(
  conversationId: Ref<string | null | undefined>,
  myUserId: Ref<string | null | undefined>
) {
  const peerTyping = ref(false)
  let peerIdleTimer: ReturnType<typeof setTimeout> | null = null
  let handler: ((p: TypingPayload) => void) | null = null
  let unsubReady: (() => void) | null = null

  function detachTypingListener() {
    const s = getChatSocket()
    if (s && handler) {
      s.off('typing:update', handler)
    }
    handler = null
    if (peerIdleTimer) {
      clearTimeout(peerIdleTimer)
      peerIdleTimer = null
    }
  }

  function attachTypingListener() {
    const s = getChatSocket()
    if (!s) {
      return
    }
    detachTypingListener()
    handler = (payload: TypingPayload) => {
      const cid = conversationId.value
      const mine = myUserId.value
      if (
        !cid
        || payload.conversationId == null
        || String(payload.conversationId) !== String(cid)
      ) {
        return
      }
      if (
        mine != null
        && payload.userId != null
        && String(payload.userId) === String(mine)
      ) {
        return
      }
      if (payload.typing) {
        peerTyping.value = true
        if (peerIdleTimer) {
          clearTimeout(peerIdleTimer)
        }
        peerIdleTimer = setTimeout(() => {
          peerTyping.value = false
          peerIdleTimer = null
        }, PEER_TYPING_IDLE_MS)
      } else {
        peerTyping.value = false
        if (peerIdleTimer) {
          clearTimeout(peerIdleTimer)
          peerIdleTimer = null
        }
      }
    }
    s.on('typing:update', handler)
  }

  unsubReady = onChatSocketReady(() => {
    attachTypingListener()
  })

  watch(conversationId, () => {
    peerTyping.value = false
    if (peerIdleTimer) {
      clearTimeout(peerIdleTimer)
      peerIdleTimer = null
    }
  })

  onUnmounted(() => {
    detachTypingListener()
    unsubReady?.()
    unsubReady = null
  })

  function setTyping(typing: boolean) {
    const cid = conversationId.value
    if (!cid) {
      return
    }
    emitConversationTyping(String(cid), typing)
  }

  return { peerTyping, setTyping }
}
