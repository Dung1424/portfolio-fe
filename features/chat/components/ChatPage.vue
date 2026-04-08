<script setup>
import { picsumAvatarUrl } from '~/utils/picsumAvatar'

/**
 * Messages — mock data; bố cục kiểu Apple Messages (2 tầng header + danh sách có cột xanh).
 */
const now = new Date()

function timeLabel(d) {
  const t = typeof d === 'string' ? new Date(d) : d
  const diff = now - t
  if (diff < 86_400_000)
    return t.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  if (diff < 7 * 86_400_000)
    return t.toLocaleDateString(undefined, { weekday: 'short' })
  return t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Ảnh demo ổn định theo seed (Picsum) */
function avatarSrc(seed) {
  return picsumAvatarUrl(seed)
}

const mockConversations = [
  {
    id: '1',
    avatarSeed: 'pf-chat-minhanh',
    name: 'Minh Anh',
    username: 'minhanh',
    lastMessage: 'Ảnh bộ sunset đẹp quá, cho mình xin preset nhé!',
    updatedAt: new Date(now - 18 * 60_000),
    unread: 2,
    online: true,
    messages: [
      { id: 'm1', text: 'Chào bạn, portfolio của bạn rất ấn tượng.', me: false, at: new Date(now - 120 * 60_000) },
      { id: 'm2', text: 'Cảm ơn bạn! Rất vui được kết nối.', me: true, at: new Date(now - 115 * 60_000) },
      { id: 'm3', text: 'Ảnh bộ sunset đẹp quá, cho mình xin preset nhé!', me: false, at: new Date(now - 18 * 60_000) }
    ]
  },
  {
    id: '2',
    avatarSeed: 'pf-chat-lightbox',
    name: 'Studio Lightbox',
    username: 'lightbox_studio',
    lastMessage: 'Bạn có slot cuối tuần này không?',
    updatedAt: new Date(now - 3 * 86_400_000),
    unread: 0,
    online: false,
    messages: [
      { id: 'm1', text: 'Xin chào, chúng tôi muốn hỏi về chụp sự kiện.', me: false, at: new Date(now - 4 * 86_400_000) },
      { id: 'm2', text: 'Bạn có slot cuối tuần này không?', me: false, at: new Date(now - 3 * 86_400_000) }
    ]
  },
  {
    id: '3',
    avatarSeed: 'pf-chat-hamy',
    name: 'Hà My',
    username: 'hamy_photo',
    lastMessage: 'Ok, gửi mình link drive nhé.',
    updatedAt: new Date(now - 45 * 60_000),
    unread: 0,
    online: true,
    messages: [
      { id: 'm1', text: 'Mình đã xem gallery wedding — rất ổn.', me: false, at: new Date(now - 50 * 60_000) },
      { id: 'm2', text: 'Cảm ơn! Mình gửi file raw qua drive được không?', me: true, at: new Date(now - 48 * 60_000) },
      { id: 'm3', text: 'Ok, gửi mình link drive nhé.', me: false, at: new Date(now - 45 * 60_000) }
    ]
  }
]

const conversations = ref(mockConversations)
const query = ref('')
const selectedId = ref(mockConversations[0]?.id ?? null)
const draft = ref('')
const mobileShowThread = ref(false)
/** fallback khi ảnh avatar lỗi (Set trong ref — gán lại để trigger) */
const brokenAvatarIds = ref(new Set())

function markAvatarBroken(id) {
  const next = new Set(brokenAvatarIds.value)
  next.add(id)
  brokenAvatarIds.value = next
}

function isAvatarBroken(id) {
  return brokenAvatarIds.value.has(id)
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q)
    return conversations.value
  return conversations.value.filter(
    c =>
      c.name.toLowerCase().includes(q)
      || c.username.toLowerCase().includes(q)
      || c.lastMessage.toLowerCase().includes(q)
  )
})

const active = computed(() =>
  conversations.value.find(c => c.id === selectedId.value) ?? null
)

const messagesScrollEl = ref(null)

function scrollMessagesToBottom() {
  nextTick(() => {
    const el = messagesScrollEl.value
    if (el)
      el.scrollTop = el.scrollHeight
  })
}

/** Chỉ cuộn khi đổi hội thoại / gửi tin — không watch length (tránh nhảy layout sau mount). */
watch(selectedId, () => scrollMessagesToBottom())

onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => scrollMessagesToBottom())
  })
})

function selectConversation(id) {
  selectedId.value = id
  const c = conversations.value.find(x => x.id === id)
  if (c)
    c.unread = 0
  mobileShowThread.value = true
}

function backToList() {
  mobileShowThread.value = false
}

function send() {
  const text = draft.value.trim()
  if (!text || !active.value)
    return
  const msg = {
    id: `local-${Date.now()}`,
    text,
    me: true,
    at: new Date()
  }
  active.value.messages.push(msg)
  active.value.lastMessage = text
  active.value.updatedAt = msg.at
  draft.value = ''
  scrollMessagesToBottom()
}

function onComposerKeydown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    send()
  }
}

function initials(name) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

const fallbackTint = ['bg-[#1877f2]', 'bg-[#166fe5]', 'bg-[#1464d4]']

function fallbackClass(id) {
  const n = Number.parseInt(id, 10) || 0
  return fallbackTint[n % fallbackTint.length]
}
</script>

<template>
  <div
    class="chat-page flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden bg-white font-sans text-[15px] leading-relaxed text-zinc-900 antialiased [-webkit-font-smoothing:antialiased]"
  >
    <div class="flex h-full min-h-0 w-full flex-1 flex-col">
      <div
        class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white md:flex-row"
      >
        <!-- Cột trái: danh sách (Messages / macOS style) -->
        <aside
          class="flex h-full min-h-0 w-full min-w-0 shrink-0 flex-col overflow-hidden border-zinc-200/90 bg-white md:h-full md:w-[300px] lg:w-[320px] md:border-r"
          :class="mobileShowThread ? 'hidden md:flex' : 'flex flex-1 md:flex-none'"
        >
          <div class="border-b border-zinc-200/90 px-4 pb-3 pt-3">
            <div class="flex items-center justify-between gap-3">
              <h1 class="text-[18px] font-semibold tracking-tight text-zinc-900">
                Messages
              </h1>
              <NuxtLink
                to="/account"
                class="rounded-full bg-zinc-100 px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-200/90"
              >
                Account
              </NuxtLink>
            </div>
            <label class="relative mt-4 block">
              <span class="sr-only">Search</span>
              <i
                class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#1877f2]/40"
              />
              <input
                v-model="query"
                type="search"
                placeholder="Search people or messages"
                class="w-full rounded-full border border-zinc-200/90 bg-zinc-50 py-2 pl-10 pr-4 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#1877f2]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877f2]/12"
              >
            </label>
          </div>

          <ul class="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto">
            <li v-if="filtered.length === 0" class="px-4 py-14 text-center text-[14px] text-zinc-500">
              No results.
            </li>
            <li v-for="c in filtered" :key="c.id">
              <button
                type="button"
                class="flex w-full gap-3 border-l-[4px] py-3 pl-3 pr-3 text-left transition-colors"
                :class="
                  selectedId === c.id
                    ? 'border-[#1877f2] bg-zinc-50/90'
                    : 'border-transparent hover:bg-zinc-50'
                "
                @click="selectConversation(c.id)"
              >
                <div class="relative shrink-0">
                  <img
                    v-if="!isAvatarBroken(c.id)"
                    :src="avatarSrc(c.avatarSeed)"
                    alt=""
                    width="48"
                    height="48"
                    class="h-12 w-12 rounded-full object-cover shadow-sm"
                    loading="lazy"
                    decoding="async"
                    @error="markAvatarBroken(c.id)"
                  >
                  <div
                    v-else
                    class="flex h-12 w-12 items-center justify-center rounded-full text-[13px] font-semibold text-white shadow-sm"
                    :class="fallbackClass(c.id)"
                  >
                    {{ initials(c.name) }}
                  </div>
                  <span
                    v-if="c.online"
                    class="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#34c759]"
                    title="Online"
                  />
                </div>
                <div class="min-w-0 flex-1 py-0.5">
                  <div class="flex items-baseline justify-between gap-2">
                    <span class="truncate text-[15px] font-semibold text-zinc-900">{{ c.name }}</span>
                    <time class="shrink-0 text-[11px] tabular-nums text-zinc-400">{{ timeLabel(c.updatedAt) }}</time>
                  </div>
                  <p class="mt-0.5 line-clamp-2 text-[13px] leading-snug text-zinc-500">
                    {{ c.lastMessage }}
                  </p>
                </div>
                <span
                  v-if="c.unread > 0"
                  class="self-center flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#1877f2] px-1.5 text-[11px] font-bold text-white"
                >{{ c.unread > 9 ? '9+' : c.unread }}</span>
              </button>
            </li>
          </ul>
        </aside>

        <!-- Cột phải: header + vùng cuộn + composer — bọc 1 flex-col + min-h-0 để thanh nhập luôn dính đáy -->
        <section
          class="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#f0f2f5]"
          :class="[!mobileShowThread ? 'hidden md:flex' : 'flex']"
        >
          <template v-if="active">
            <!-- Khóa bố cục bằng CSS grid (inline) để chắc chắn: header + messages (minmax) + composer -->
            <div
              class="h-full min-h-0 flex-1 overflow-hidden"
              style="display:grid; grid-template-rows:auto minmax(0, 1fr) auto; height: 100%;"
            >
              <!-- Header một hàng: avatar + tên (hạ nhẹ) + trạng thái | Call + Video bên phải -->
              <div class="border-b border-zinc-200 bg-white">
                <div class="flex items-center gap-3 px-4 py-3.5 sm:px-5">
                <button
                  type="button"
                  class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 md:hidden"
                  aria-label="Back"
                  @click="backToList"
                >
                  <i class="fa-solid fa-chevron-left text-[15px]" />
                </button>
                <div class="relative h-12 w-12 shrink-0">
                  <img
                    v-if="!isAvatarBroken(active.id)"
                    :src="avatarSrc(active.avatarSeed)"
                    alt=""
                    width="48"
                    height="48"
                    class="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-200/80"
                    loading="eager"
                    decoding="async"
                    fetchpriority="high"
                    @error="markAvatarBroken(active.id)"
                  >
                  <div
                    v-else
                    class="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm ring-1 ring-zinc-200/80"
                    :class="fallbackClass(active.id)"
                  >
                    {{ initials(active.name) }}
                  </div>
                </div>
                <div class="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                  <p class="truncate text-[17px] font-semibold leading-tight text-zinc-900">
                    {{ active.name }}
                  </p>
                  <p
                    v-if="active.online"
                    class="text-[13px] font-normal leading-tight text-[#1877f2]"
                  >
                    <span aria-hidden="true">• </span>Active now
                  </p>
                  <p v-else class="truncate text-[13px] leading-tight text-zinc-500">
                    @{{ active.username }}
                  </p>
                </div>
                <div
                  class="flex shrink-0 items-center gap-0.5 sm:gap-1"
                  role="toolbar"
                  aria-label="Call actions"
                >
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-[#1877f2]"
                    aria-label="Voice call"
                  >
                    <i class="fa-solid fa-phone text-[15px]" />
                  </button>
                  <button
                    type="button"
                    class="flex h-10 w-10 items-center justify-center rounded-full text-zinc-600 transition hover:bg-zinc-100 hover:text-[#1877f2]"
                    aria-label="Video call"
                  >
                    <i class="fa-solid fa-video text-[14px]" />
                  </button>
                </div>
                </div>
              </div>

              <div
                ref="messagesScrollEl"
                class="chat-messages-scroll min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5"
              >
              <div class="flex w-full flex-col gap-3">
                <div
                  v-for="m in active.messages"
                  :key="m.id"
                  class="flex gap-2.5"
                  :class="m.me ? 'justify-end' : 'justify-start'"
                >
                  <img
                    v-if="!m.me && !isAvatarBroken(active.id)"
                    :src="avatarSrc(active.avatarSeed)"
                    alt=""
                    width="28"
                    height="28"
                    class="mt-0.5 h-7 w-7 shrink-0 self-end rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  >
                  <div
                    v-else-if="!m.me"
                    class="mt-0.5 flex h-7 w-7 shrink-0 self-end items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="fallbackClass(active.id)"
                  >
                    {{ initials(active.name).slice(0, 1) }}
                  </div>
                  <div
                    class="max-w-[85%] sm:max-w-[70%]"
                    :class="m.me ? 'flex flex-col items-end' : ''"
                  >
                    <div
                      class="px-3.5 py-2.5 text-[15px] leading-[1.45] shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
                      :class="
                        m.me
                          ? 'rounded-[18px] rounded-br-[4px] bg-[#1877f2] text-white'
                          : 'rounded-[18px] rounded-bl-[4px] border border-zinc-200/80 bg-white text-zinc-800'
                      "
                    >
                      <p class="whitespace-pre-wrap break-words">
                        {{ m.text }}
                      </p>
                    </div>
                    <p
                      class="mt-1 px-1.5 text-[11px] text-zinc-400"
                      :class="m.me ? 'text-right' : 'text-left'"
                    >
                      {{ timeLabel(m.at) }}
                    </p>
                  </div>
                </div>
              </div>
              </div>

              <div class="border-t border-zinc-200 bg-white px-4 py-3 sm:px-5">
                <form @submit.prevent="send">
                  <div
                    class="composer-bar flex min-h-[48px] items-center gap-1.5 rounded-full border border-zinc-200/90 bg-[#f0f2f5] py-1.5 pl-2.5 pr-2 transition focus-within:border-[#1877f2]/35 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(24,119,242,0.12)]"
                  >
                    <button
                      type="button"
                      class="composer-icon-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-[#1877f2]"
                      aria-label="Attach"
                    >
                      <i class="fa-solid fa-plus text-[18px] leading-none" />
                    </button>
                    <textarea
                      v-model="draft"
                      rows="1"
                      placeholder="Message"
                      autocomplete="off"
                      class="min-h-[40px] max-h-28 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2.5 align-middle text-[15px] leading-[1.35] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
                      @keydown="onComposerKeydown"
                    />
                    <button
                      type="submit"
                      class="composer-send flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-[14px] text-white shadow-sm transition hover:bg-[#166fe5] active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#e4e6eb] disabled:text-[#bcc0c4] disabled:shadow-none"
                      :disabled="!draft.trim()"
                      aria-label="Send"
                    >
                      <i class="fa-solid fa-arrow-up leading-none" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </template>

          <div
            v-else
            class="hidden flex-1 flex-col items-center justify-center gap-2 px-8 text-center md:flex"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-200/80 text-zinc-400">
              <i class="fa-regular fa-message text-xl" />
            </div>
            <p class="text-[15px] font-medium text-zinc-600">
              No conversation selected
            </p>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Block CSS thật (không để trống) — tránh @tailwindcss/vite coi <script> là CSS. */
.chat-page {
  isolation: isolate;
}
</style>
