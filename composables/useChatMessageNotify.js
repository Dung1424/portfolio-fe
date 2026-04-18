import { computed, ref, unref } from 'vue'
import {
  getChatNotifyPublicSrc,
  playChatNotificationSound,
  unlockChatNotificationAudio
} from '~/utils/chatMessageSound.js'

/**
 * @param {import('vue').Ref<string | null>} selectedId
 * @param {import('vue').Ref<boolean>} mobileShowThread
 */
export function useChatMessageNotify(selectedId, mobileShowThread) {
  const notifyAudioRef = ref(null)
  const notifySoundSrc = computed(() => getChatNotifyPublicSrc())

  function unlockNotifyAudio() {
    unlockChatNotificationAudio(notifyAudioRef.value)
  }

  function isViewingConversationThread(conversationId) {
    if (String(unref(selectedId) ?? '') !== String(conversationId)) {
      return false
    }
    if (!import.meta.client || typeof window === 'undefined') {
      return true
    }
    if (window.matchMedia('(min-width: 768px)').matches) {
      return true
    }
    return unref(mobileShowThread) === true
  }

  function maybePlayIncomingNotify(isIncoming, conversationId) {
    if (!isIncoming) {
      return
    }
    if (isViewingConversationThread(conversationId)) {
      return
    }
    playChatNotificationSound(notifyAudioRef.value)
  }

  /** @type {(() => void) | null} */
  let removeUnlockListeners = null

  function mountNotifyUnlock() {
    if (!import.meta.client) {
      return
    }
    const unlock = () => {
      unlockNotifyAudio()
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      window.removeEventListener('touchstart', unlock, true)
      removeUnlockListeners = null
    }
    removeUnlockListeners = () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
      window.removeEventListener('touchstart', unlock, true)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    window.addEventListener('touchstart', unlock, { capture: true, passive: true })
  }

  function unmountNotifyUnlock() {
    removeUnlockListeners?.()
    removeUnlockListeners = null
  }

  return {
    notifyAudioRef,
    notifySoundSrc,
    unlockNotifyAudio,
    maybePlayIncomingNotify,
    mountNotifyUnlock,
    unmountNotifyUnlock
  }
}
