import { io } from 'socket.io-client'
import getUrlList from '~/services/getUrlList.js'

/** @type {import('socket.io-client').Socket | null} */
let ioRef = null

/** @type {Set<() => void>} */
const socketReadyCallbacks = new Set()

/**
 * Goi sau khi socket connect (lan dau hoac reconnect). Dung de gan listener, khong dung shallowRef trong file .js.
 * @param {() => void} cb
 * @returns {() => void} unsubscribe
 */
export function onChatSocketReady(cb) {
  if (!import.meta.client) {
    return () => {}
  }
  socketReadyCallbacks.add(cb)
  if (ioRef?.connected) {
    queueMicrotask(() => {
      try {
        cb()
      } catch (e) {
        console.error(e)
      }
    })
  }
  return () => {
    socketReadyCallbacks.delete(cb)
  }
}

function emitSocketReady() {
  socketReadyCallbacks.forEach((cb) => {
    try {
      cb()
    } catch (e) {
      console.error(e)
    }
  })
}

export function getChatSocket() {
  return ioRef
}

/**
 * Kết nối Socket.IO tới cùng host:port chat server (REST là `/api/v1/...` trên host đó).
 * Token JWT Laravel — backend doc handshake.auth.token.
 */
export function connectChatSocket() {
  if (!import.meta.client) {
    return null
  }
  if (ioRef?.connected) {
    emitSocketReady()
    return ioRef
  }
  const token = localStorage.getItem('token')
  const url = getUrlList().chatServerOrigin
  ioRef = io(url, {
    auth: token ? { token } : {},
    autoConnect: true,
    transports: ['websocket', 'polling']
  })
  ioRef.on('connect', emitSocketReady)
  return ioRef
}

export function disconnectChatSocket() {
  if (ioRef) {
    ioRef.removeAllListeners()
    ioRef.disconnect()
    ioRef = null
  }
}

/**
 * @param {string} conversationId — trùng id hội thoại REST / path param
 * @param {(err?: unknown) => void} [ack]
 */
export function emitRoomJoin(conversationId, ack) {
  const s = ioRef
  if (!s) {
    return
  }
  const id = String(conversationId)
  const run = () => {
    s.emit('room:join', id, (err) => {
      if (typeof ack === 'function') {
        ack(err)
      }
    })
  }
  if (s.connected) {
    run()
  } else {
    s.once('connect', run)
  }
}

/**
 * Go dang nhap trong hoi thoai. Can JWT trong handshake + da `room:join` conversationId.
 * Doi phuong nhan event `typing:update` { conversationId, userId, typing }.
 * @param {string} conversationId
 * @param {boolean} typing
 */
export function emitConversationTyping(conversationId, typing) {
  const s = ioRef
  if (!s?.connected) {
    return
  }
  s.emit('typing', {
    conversationId: String(conversationId),
    typing: Boolean(typing)
  })
}
