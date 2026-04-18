import { ref, watch } from 'vue'
import { notification } from 'ant-design-vue'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'

const SEARCH_DEBOUNCE_MS = 420

/**
 * Tìm tin trong thread (debounce + phân trang), reset khi đổi hội thoại.
 *
 * @param {import('vue').ComputedRef<object | null>} active
 * @param {import('vue').Ref<string | null>} selectedId
 * @param {(messageId: string) => Promise<void>} jumpToMessage
 */
export function useChatThreadSearch(active, selectedId, jumpToMessage) {
  const threadSearchOpen = ref(false)
  const threadSearchDraft = ref('')
  const threadSearchLoading = ref(false)
  const threadSearchResults = ref([])
  const threadSearchNextCursor = ref(null)
  const threadSearchHasMore = ref(false)
  let threadSearchDebounceTimer = null

  function clearThreadSearchDebounce() {
    if (threadSearchDebounceTimer) {
      clearTimeout(threadSearchDebounceTimer)
      threadSearchDebounceTimer = null
    }
  }

  function resetThreadSearchState() {
    clearThreadSearchDebounce()
    threadSearchDraft.value = ''
    threadSearchResults.value = []
    threadSearchNextCursor.value = null
    threadSearchHasMore.value = false
    threadSearchLoading.value = false
  }

  function toggleThreadSearch() {
    threadSearchOpen.value = !threadSearchOpen.value
    if (!threadSearchOpen.value) {
      resetThreadSearchState()
    }
  }

  watch(selectedId, () => {
    threadSearchOpen.value = false
    resetThreadSearchState()
  })

  async function fetchThreadSearch({ append = false } = {}) {
    const cid = active.value?.id
    if (!cid || !threadSearchOpen.value) {
      return
    }
    const q = threadSearchDraft.value.trim()
    if (!q) {
      if (!append) {
        threadSearchResults.value = []
        threadSearchNextCursor.value = null
        threadSearchHasMore.value = false
      }
      return
    }
    threadSearchLoading.value = true
    try {
      const res = await chatApi.searchMessagesInConversation(cid, {
        q,
        chunkSize: 20,
        ...(append && threadSearchNextCursor.value
          ? { cursor: threadSearchNextCursor.value }
          : {}),
      })
      const data = unwrapChatData(res)
      const hits = Array.isArray(data?.hits) ? data.hits : []
      threadSearchNextCursor.value = data?.nextCursor ?? null
      threadSearchHasMore.value = Boolean(data?.hasMore)
      if (append) {
        threadSearchResults.value = [...threadSearchResults.value, ...hits]
      } else {
        threadSearchResults.value = hits
      }
    } catch (e) {
      console.error('searchMessages', e)
      if (!append) {
        threadSearchResults.value = []
        threadSearchNextCursor.value = null
        threadSearchHasMore.value = false
      }
      notification.error({
        message: 'Search',
        description: e.response?.data?.message || 'Could not search messages.',
      })
    } finally {
      threadSearchLoading.value = false
    }
  }

  watch(threadSearchDraft, () => {
    if (!threadSearchOpen.value) {
      return
    }
    clearThreadSearchDebounce()
    threadSearchDebounceTimer = setTimeout(() => {
      threadSearchDebounceTimer = null
      fetchThreadSearch({ append: false })
    }, SEARCH_DEBOUNCE_MS)
  })

  watch(threadSearchOpen, (open) => {
    if (open && threadSearchDraft.value.trim()) {
      clearThreadSearchDebounce()
      fetchThreadSearch({ append: false })
    }
  })

  function loadMoreThreadSearch() {
    if (!threadSearchHasMore.value || threadSearchLoading.value) {
      return
    }
    fetchThreadSearch({ append: true })
  }

  async function onThreadSearchResultClick(hit) {
    const id = hit?.id != null ? String(hit.id) : ''
    if (!id) {
      return
    }
    threadSearchOpen.value = false
    resetThreadSearchState()
    await jumpToMessage(id)
  }

  return {
    threadSearchOpen,
    threadSearchDraft,
    threadSearchLoading,
    threadSearchResults,
    threadSearchNextCursor,
    threadSearchHasMore,
    toggleThreadSearch,
    loadMoreThreadSearch,
    onThreadSearchResultClick,
    clearThreadSearchDebounce,
  }
}
