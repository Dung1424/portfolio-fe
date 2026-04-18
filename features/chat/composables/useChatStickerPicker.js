import { ref, computed } from 'vue'

export const STICKER_PACK_IDS = ['sticker1', 'sticker2']

export const STICKER_PACK_LABELS = {
  sticker1: 'Loopy',
  sticker2: 'Capybara',
}

const STICKER_DISCOVERY_MAX = 80
const STICKER_DISCOVERY_MISS_STREAK = 12

async function discoverStickerPack(packId) {
  const result = []
  const seen = new Set()
  let missStreak = 0
  for (let i = 1; i <= STICKER_DISCOVERY_MAX; i++) {
    const candidates = [
      `/${packId}/image${i}.jpg`,
      `/${packId}/image${i}.jpeg`,
      `/${packId}/image${i}.png`,
      `/${packId}/image${i}.webp`,
      `/${packId}/${i}.jpg`,
      `/${packId}/${i}.jpeg`,
      `/${packId}/${i}.png`,
      `/${packId}/${i}.webp`,
    ]
    let foundForIndex = false
    for (const url of candidates) {
      if (seen.has(url)) {
        continue
      }
      seen.add(url)
      try {
        const res = await fetch(url, { method: 'HEAD', cache: 'no-cache' })
        if (!res.ok) {
          continue
        }
        result.push({
          id: `${packId}-${i}-${result.length + 1}`,
          pack: packId,
          url,
        })
        foundForIndex = true
        break
      } catch {
        // ignore network errors and continue probing
      }
    }
    if (foundForIndex) {
      missStreak = 0
    } else {
      missStreak += 1
      if (result.length > 0 && missStreak >= STICKER_DISCOVERY_MISS_STREAK) {
        break
      }
    }
  }
  return result
}

/**
 * @param {{
 *   messagingAllowed: import('vue').ComputedRef<boolean>
 *   stopTypingNow: () => void
 *   postChatSticker: (sticker: unknown, unlock: () => void) => void
 *   unlockNotifyAudio: () => void
 * }} deps
 */
export function useChatStickerPicker(deps) {
  const { messagingAllowed, stopTypingNow, postChatSticker, unlockNotifyAudio } = deps

  const stickerPickerOpen = ref(false)
  const stickerPackActive = ref('sticker1')
  const stickerPackMap = ref({
    sticker1: [],
    sticker2: [],
  })
  const stickerPackLoaded = ref({
    sticker1: false,
    sticker2: false,
  })

  async function loadStickerPack(packId) {
    if (!STICKER_PACK_IDS.includes(packId) || stickerPackLoaded.value[packId]) {
      return
    }
    try {
      stickerPackMap.value[packId] = await discoverStickerPack(packId)
    } catch (e) {
      console.warn('loadStickerPack discovery', packId, e)
      stickerPackMap.value[packId] = []
    } finally {
      stickerPackLoaded.value[packId] = true
    }
  }

  function toggleStickerPicker() {
    if (!stickerPickerOpen.value && !messagingAllowed.value) {
      return
    }
    stickerPickerOpen.value = !stickerPickerOpen.value
    if (stickerPickerOpen.value) {
      loadStickerPack(stickerPackActive.value)
    }
  }

  function selectStickerPack(packId) {
    stickerPackActive.value = packId
    loadStickerPack(packId)
  }

  const stickerRows = computed(() => stickerPackMap.value[stickerPackActive.value] || [])

  function onStickerImageError(sticker) {
    const list = stickerPackMap.value[sticker.pack] || []
    stickerPackMap.value[sticker.pack] = list.filter(x => x.id !== sticker.id)
  }

  function sendStickerMessage(sticker) {
    if (!messagingAllowed.value) {
      return
    }
    stopTypingNow()
    postChatSticker(sticker, unlockNotifyAudio)
    stickerPickerOpen.value = false
  }

  return {
    stickerPickerOpen,
    stickerPackActive,
    stickerPackMap,
    stickerPackLoaded,
    stickerRows,
    loadStickerPack,
    toggleStickerPicker,
    selectStickerPack,
    onStickerImageError,
    sendStickerMessage,
  }
}
