import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { notification } from 'ant-design-vue'
import { useUserStore } from '~/stores/userStore.js'
import { useResolvePublicMediaUrl } from '~/composables/useMediaBase'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import { profileService } from '~/features/profile/services/profile.api.js'
import { mapApiConversationToUi } from '~/utils/chatMappers.js'

const peerProfileCache = new Map()

/**
 * @param {import('vue').Ref<string | null>} selectedId
 * @param {import('vue').Ref<boolean>} mobileShowThread
 */
export function useChatConversationList(selectedId, mobileShowThread) {
  const route = useRoute()
  const router = useRouter()
  const userStore = useUserStore()
  const { resolveMediaUrl } = useResolvePublicMediaUrl()

  const conversations = ref([])
  const listFolder = ref('inbox')
  const inboxUnreadTotal = ref(0)
  const pendingUnreadTotal = ref(0)
  let folderUnreadDebounceTimer = null
  const listLoading = ref(false)

  async function fetchPeerProfile(peerUserId) {
    if (!peerUserId) {
      return null
    }
    if (peerProfileCache.has(peerUserId)) {
      return peerProfileCache.get(peerUserId)
    }
    try {
      const token = import.meta.client ? localStorage.getItem('token') : null
      const res = await profileService.fetchByUserId(peerUserId, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const raw = res?.data?.data ?? res?.data
      const user = raw?.user ?? raw
      if (user?.id) {
        peerProfileCache.set(peerUserId, user)
        return user
      }
    }
    catch (e) {
      console.error('fetchPeerProfile', e)
    }
    return null
  }

  function applyPeerUserToConversation(conv, user) {
    if (!user || !conv) {
      return
    }
    conv.name = (user.name && String(user.name).trim()) || user.username || conv.name
    conv.username = user.username || conv.username
    const pic = user.profile_picture
    conv.peerAvatarUrl = pic ? resolveMediaUrl(pic) : ''
    conv.peerProfileLoaded = true
  }

  async function enrichAllConversationPeers(list) {
    const ids = [...new Set(list.map(c => c.peerUserId).filter(Boolean))]
    await Promise.all(
      ids.map(async (pid) => {
        const user = await fetchPeerProfile(String(pid))
        if (!user) {
          return
        }
        for (const c of list) {
          if (String(c.peerUserId) === String(pid)) {
            applyPeerUserToConversation(c, user)
          }
        }
      }),
    )
  }

  async function applyPresenceToConversations(list) {
    const ids = [...new Set(list.map(c => c.peerUserId).filter(Boolean))]
    if (!ids.length) {
      return
    }
    try {
      const res = await chatApi.presenceQuery(ids)
      const data = unwrapChatData(res)
      const users = data?.users ?? {}
      for (const c of list) {
        const p = c.peerUserId
        if (!p) {
          continue
        }
        const row = users[String(p)]
        if (row && typeof row.online === 'boolean') {
          c.online = row.online
        }
        if (row && row.lastSeenAt != null && Number.isFinite(Number(row.lastSeenAt))) {
          c.peerLastSeenAt = Number(row.lastSeenAt)
        }
        else if (row?.online === true) {
          c.peerLastSeenAt = null
        }
      }
    }
    catch (e) {
      console.error('presenceQuery', e)
    }
  }

  function onPresenceUpdate(payload) {
    const uid = payload?.userId != null ? String(payload.userId) : ''
    if (!uid) {
      return
    }
    const online = Boolean(payload?.online)
    const ls = payload?.lastSeenAt
    for (const c of conversations.value) {
      if (String(c.peerUserId) === uid) {
        c.online = online
        if (online) {
          c.peerLastSeenAt = null
        }
        else if (ls != null && Number.isFinite(Number(ls))) {
          c.peerLastSeenAt = Number(ls)
        }
      }
    }
  }

  function applyPeerHintsFromRoute() {
    const cid = route.query.conversationId
    const peerName = route.query.peerName
    const peerUsername = route.query.peerUsername
    if (!cid || !peerName) {
      return
    }
    const c = conversations.value.find(x => x.id === String(cid))
    if (c) {
      c.name = String(peerName)
      if (peerUsername) {
        c.username = String(peerUsername)
      }
    }
  }

  async function refreshFolderUnreadTotals() {
    try {
      const res = await chatApi.folderUnreadSummary()
      const data = unwrapChatData(res)
      const inbox = data?.inbox?.unreadTotal
      const pending = data?.pending?.unreadTotal
      if (typeof inbox === 'number') {
        inboxUnreadTotal.value = Math.max(0, inbox)
      }
      if (typeof pending === 'number') {
        pendingUnreadTotal.value = Math.max(0, pending)
      }
    }
    catch (e) {
      console.error('folderUnreadSummary', e)
    }
  }

  function scheduleRefreshFolderUnreadTotals() {
    clearTimeout(folderUnreadDebounceTimer)
    folderUnreadDebounceTimer = setTimeout(() => {
      folderUnreadDebounceTimer = null
      refreshFolderUnreadTotals()
    }, 320)
  }

  async function loadConversationList() {
    listLoading.value = true
    try {
      const res = await chatApi.listConversations({ folder: listFolder.value, limit: 20, page: 1 })
      const data = unwrapChatData(res)
      const rows = data?.conversations ?? []
      const my = userStore.user?.id
      conversations.value = rows.map(r => mapApiConversationToUi(r, my))
      await enrichAllConversationPeers(conversations.value)
      await applyPresenceToConversations(conversations.value)
      applyPeerHintsFromRoute()
      const qCid = route.query.conversationId
      if (qCid) {
        await ensureConversationInList(String(qCid))
        applyPeerHintsFromRoute()
        selectedId.value = String(qCid)
        mobileShowThread.value = true
        await router.replace({ path: '/chat' })
      }
      else if (selectedId.value && !conversations.value.some(c => c.id === String(selectedId.value))) {
        selectedId.value = null
        mobileShowThread.value = false
      }
    }
    catch (e) {
      console.error('loadConversationList', e)
      notification.error({
        message: 'Messages',
        description: e.response?.data?.message || 'Could not load conversations.',
      })
    }
    finally {
      listLoading.value = false
      await refreshFolderUnreadTotals()
    }
  }

  async function setListFolder(folder) {
    const f = folder === 'pending' ? 'pending' : 'inbox'
    if (listFolder.value === f) {
      return
    }
    listFolder.value = f
    selectedId.value = null
    mobileShowThread.value = false
    await loadConversationList()
  }

  async function ensureConversationInList(cid) {
    const c = conversations.value.find(x => x.id === String(cid))
    if (c) {
      return c
    }
    try {
      const res = await chatApi.getConversation(cid)
      const raw = unwrapChatData(res)
      const apiConv = raw?.conversation ?? raw
      if (!apiConv?.id) {
        return null
      }
      const ui = mapApiConversationToUi(apiConv, userStore.user?.id)
      conversations.value.unshift(ui)
      await enrichAllConversationPeers([ui])
      await applyPresenceToConversations([ui])
      return ui
    }
    catch (e) {
      console.error('getConversation', e)
      return null
    }
  }

  function clearFolderUnreadDebounce() {
    clearTimeout(folderUnreadDebounceTimer)
    folderUnreadDebounceTimer = null
  }

  return {
    conversations,
    listFolder,
    inboxUnreadTotal,
    pendingUnreadTotal,
    listLoading,
    loadConversationList,
    setListFolder,
    ensureConversationInList,
    enrichAllConversationPeers,
    applyPresenceToConversations,
    applyPeerHintsFromRoute,
    onPresenceUpdate,
    refreshFolderUnreadTotals,
    scheduleRefreshFolderUnreadTotals,
    clearFolderUnreadDebounce,
  }
}
