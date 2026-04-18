/**
 * `public/thongbao.mp3` — browsers block play() until user gesture.
 * Prefer playing via a visible <audio> ref from ChatPage; this file is fallback.
 */

function publicAssetUrl(fileName) {
  /**
   * `public/*` is served at the site root (e.g. /thongbao.mp3).
   * In some Nuxt/Vite client chunks `import.meta.env.BASE_URL` is `/_nuxt/` — wrong for public files.
   */
  let base = import.meta.env.BASE_URL || '/'
  if (base.includes('_nuxt')) {
    base = '/'
  }
  if (!base.endsWith('/')) {
    base += '/'
  }
  const path = `${base}${fileName}`.replace(/\/{2,}/g, '/')
  if (!import.meta.client || typeof window === 'undefined' || !window.location?.origin) {
    return path
  }
  try {
    return new URL(path, window.location.origin).href
  } catch {
    return path
  }
}

/** Use as :src on <audio> (path or absolute URL). */
export function getChatNotifyPublicSrc() {
  return publicAssetUrl('thongbao.mp3')
}

/**
 * Call from a user event (click, touch, key) so later notification plays are allowed.
 * @param {HTMLAudioElement | null} [preferredEl]
 */
export function unlockChatNotificationAudio(preferredEl) {
  void primeChatNotificationAudio(preferredEl)
}

/**
 * Try to prime the browser audio permission from a user gesture.
 * Resolves true only when playback was actually allowed.
 * @param {HTMLAudioElement | null} [preferredEl]
 * @returns {Promise<boolean>}
 */
export function primeChatNotificationAudio(preferredEl) {
  if (!import.meta.client) {
    return Promise.resolve(false)
  }
  const src = getChatNotifyPublicSrc()
  const primeFreshAudio = () => {
    const a = new Audio(src)
    a.muted = true
    return a.play()
      .then(() => {
        a.pause()
        a.currentTime = 0
        return true
      })
      .catch(() => false)
  }
  const el = preferredEl ?? null
  if (el) {
    const prev = el.muted
    el.muted = true
    return el.play()
      .then(() => {
        el.pause()
        el.currentTime = 0
        el.muted = prev
        return true
      })
      .catch(() => {
        el.muted = prev
        return primeFreshAudio()
      })
  }
  return primeFreshAudio()
}

/**
 * @param {HTMLAudioElement | null} [preferredEl]
 */
export function playChatNotificationSound(preferredEl) {
  if (!import.meta.client) {
    return
  }
  const src = getChatNotifyPublicSrc()
  const tryPlay = (el) => {
    el.muted = false
    el.volume = 1
    el.currentTime = 0
    return el.play()
  }
  if (preferredEl) {
    void tryPlay(preferredEl).catch((e) => {
      console.warn('[chat sound] <audio> play failed, retrying new Audio()', e?.message || e)
      const a = new Audio(src)
      a.volume = 1
      void a.play().catch((e2) => {
        console.warn('[chat sound] blocked — interact with the page (click chat list or Send):', e2?.message || e2)
      })
    })
    return
  }
  const a = new Audio(src)
  a.volume = 1
  void a.play().catch((e) => {
    console.warn('[chat sound]', e?.message || e, src)
  })
}
