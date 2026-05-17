<script setup>
import { computed, ref, watch } from 'vue'
import { notification } from 'ant-design-vue'
import { chatApi, unwrapChatData } from '~/features/chat/services/chat.api.js'
import { mapApiConversationToUi } from '~/features/chat/utils/chatMappers.js'
import { profileService } from '~/features/profile/services/profile.api.js'
import { useResolvePublicMediaUrl } from '~/composables/useMediaBase'
import { useUserStore } from '~/stores/userStore.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  shareUrl: { type: String, default: '' },
  title: { type: String, default: 'Chia sẻ' },
})

const emit = defineEmits(['update:open', 'sent'])

const userStore = useUserStore()
const { resolveMediaUrl } = useResolvePublicMediaUrl()
const loading = ref(false)
const sendingId = ref('')
const conversations = ref([])
const q = ref('')

const filteredConversations = computed(() => {
  const term = q.value.trim().toLowerCase()
  if (!term) return conversations.value
  return conversations.value.filter((c) => {
    return [c.name, c.username, c.groupName]
      .filter(Boolean)
      .some(x => String(x).toLowerCase().includes(term))
  })
})

function close() {
  emit('update:open', false)
}

async function hydrateDirectPeers(list) {
  const token = import.meta.client ? localStorage.getItem('token') : null
  await Promise.all(list.filter(c => !c.isGroup && c.peerUserId).map(async (c) => {
    try {
      const res = await profileService.fetchByUserId(c.peerUserId, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const raw = res?.data?.data ?? res?.data
      const user = raw?.user ?? raw
      if (!user?.id) return
      c.name = (user.name && String(user.name).trim()) || user.username || c.name
      c.username = user.username || c.username
      c.peerAvatarUrl = user.profile_picture ? resolveMediaUrl(user.profile_picture) : c.peerAvatarUrl
    } catch (e) {
      console.error('hydrate share peer', e)
    }
  }))
}

async function loadConversations() {
  if (!props.open) return
  loading.value = true
  try {
    const [inboxRes, pendingRes] = await Promise.all([
      chatApi.listConversations({ folder: 'inbox', limit: 50 }),
      chatApi.listConversations({ folder: 'pending', limit: 50 }),
    ])
    const inboxData = unwrapChatData(inboxRes)
    const pendingData = unwrapChatData(pendingRes)
    const byId = new Map()
    for (const row of [
      ...(Array.isArray(inboxData?.conversations) ? inboxData.conversations : []),
      ...(Array.isArray(pendingData?.conversations) ? pendingData.conversations : []),
    ]) {
      if (row?.id || row?._id) {
        byId.set(String(row.id || row._id), row)
      }
    }
    const rows = [...byId.values()]
    const mapped = rows.map(row => mapApiConversationToUi(row, userStore.user?.id ?? null))
    await hydrateDirectPeers(mapped)
    conversations.value = mapped
  } catch (e) {
    console.error('load share conversations', e)
    notification.error({
      message: 'Chia sẻ',
      description: e?.response?.data?.message || 'Không tải được danh sách hội thoại.',
    })
  } finally {
    loading.value = false
  }
}

async function sendToConversation(conv) {
  const cid = conv?.id ? String(conv.id) : ''
  const url = props.shareUrl.trim()
  if (!cid || !url || sendingId.value) return
  sendingId.value = cid
  try {
    await chatApi.postMessage(cid, { text: url })
    notification.success({ message: 'Đã chia sẻ' })
    emit('sent', { conversationId: cid })
    close()
  } catch (e) {
    console.error('share to chat', e)
    notification.error({
      message: 'Chia sẻ',
      description: e?.response?.data?.message || 'Không gửi được link.',
    })
  } finally {
    sendingId.value = ''
  }
}

watch(() => props.open, (open) => {
  if (open) {
    q.value = ''
    void loadConversations()
  }
})
</script>

<template>
  <a-modal
    :open="open"
    :footer="null"
    :width="420"
    centered
    @cancel="close"
  >
    <template #title>{{ title }}</template>
    <div class="space-y-3">
      <div class="rounded-xl bg-zinc-50 px-3 py-2 text-[13px] text-zinc-600">
        <p class="line-clamp-2 break-all">{{ shareUrl }}</p>
      </div>
      <input
        v-model="q"
        type="text"
        placeholder="Tìm hội thoại"
        class="w-full rounded-xl border border-zinc-200 px-3 py-2 text-[14px] outline-none focus:border-[#1877f2]"
      >
      <div v-if="loading" class="py-8 text-center text-[13px] text-zinc-500">
        <i class="fa-solid fa-spinner fa-spin mr-1" /> Đang tải…
      </div>
      <div v-else-if="!filteredConversations.length" class="py-8 text-center text-[13px] text-zinc-500">
        Chưa có hội thoại phù hợp.
      </div>
      <div v-else class="max-h-[360px] space-y-1 overflow-y-auto">
        <button
          v-for="conv in filteredConversations"
          :key="conv.id"
          type="button"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition hover:bg-zinc-50"
          :disabled="Boolean(sendingId)"
          @click="sendToConversation(conv)"
        >
          <img
            v-if="conv.isGroup ? conv.groupAvatarUrl : conv.peerAvatarUrl"
            :src="conv.isGroup ? conv.groupAvatarUrl : conv.peerAvatarUrl"
            alt=""
            class="h-10 w-10 rounded-full object-cover"
          >
          <span v-else class="flex h-10 w-10 items-center justify-center rounded-full bg-[#1877f2] text-sm font-semibold text-white">
            {{ String(conv.name || 'C').slice(0, 2).toUpperCase() }}
          </span>
          <span class="min-w-0 flex-1">
            <span class="block truncate text-[14px] font-semibold text-zinc-900">{{ conv.name }}</span>
            <span class="block truncate text-[12px] text-zinc-500">{{ conv.isGroup ? 'Nhóm chat' : `@${conv.username || 'user'}` }}</span>
          </span>
          <i
            v-if="sendingId === String(conv.id)"
            class="fa-solid fa-spinner fa-spin text-[#1877f2]"
          />
          <i v-else class="fa-regular fa-paper-plane text-zinc-400" />
        </button>
      </div>
    </div>
  </a-modal>
</template>
