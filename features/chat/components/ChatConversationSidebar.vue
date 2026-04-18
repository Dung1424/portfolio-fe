<script setup>
import { computed } from 'vue'

const props = defineProps({
  mobileShowThread: { type: Boolean, default: false },
  listFolder: { type: String, default: 'inbox' },
  inboxUnreadTotal: { type: Number, default: 0 },
  pendingUnreadTotal: { type: Number, default: 0 },
  listLoading: { type: Boolean, default: false },
  /** Hàng hiển thị (đã filter theo ô search). */
  conversations: { type: Array, default: () => [] },
  /** Còn hội thoại trong folder (trước filter) — để phân biệt “No results” vs “No conversations”. */
  hasAnyConversations: { type: Boolean, default: false },
  selectedId: { type: [String, Number, null], default: null },
  query: { type: String, default: '' },
  defaultAvatarUrl: { type: String, required: true },
  timeLabel: { type: Function, required: true },
  initials: { type: Function, required: true },
  fallbackClass: { type: Function, required: true },
  isAvatarBroken: { type: Function, required: true },
})

const emit = defineEmits(['update:query', 'set-folder', 'select', 'open-profile', 'avatar-error'])

const queryModel = computed({
  get: () => props.query,
  set: v => emit('update:query', v),
})
</script>

<template>
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
      <div class="mt-3 flex gap-1 rounded-full bg-zinc-100/90 p-1">
        <button
          type="button"
          class="min-h-9 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition"
          :class="
            listFolder === 'inbox'
              ? 'bg-white text-[#1877f2] shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900'
          "
          @click="emit('set-folder', 'inbox')"
        >
          <span>Inbox</span>
          <span
            v-if="inboxUnreadTotal > 0"
            class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
            :class="listFolder === 'inbox' ? 'bg-[#1877f2]' : 'bg-zinc-500'"
          >{{ inboxUnreadTotal > 99 ? '99+' : inboxUnreadTotal }}</span>
        </button>
        <button
          type="button"
          class="min-h-9 flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition"
          :class="
            listFolder === 'pending'
              ? 'bg-white text-[#1877f2] shadow-sm'
              : 'text-zinc-600 hover:text-zinc-900'
          "
          @click="emit('set-folder', 'pending')"
        >
          <span>Pending</span>
          <span
            v-if="pendingUnreadTotal > 0"
            class="flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white"
            :class="listFolder === 'pending' ? 'bg-[#1877f2]' : 'bg-zinc-500'"
          >{{ pendingUnreadTotal > 99 ? '99+' : pendingUnreadTotal }}</span>
        </button>
      </div>
      <label class="relative mt-4 block">
        <span class="sr-only">Search</span>
        <i
          class="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[13px] text-[#1877f2]/40"
        />
        <input
          v-model="queryModel"
          type="search"
          placeholder="Search people or messages"
          class="w-full rounded-full border border-zinc-200/90 bg-zinc-50 py-2 pl-10 pr-4 text-[13px] text-zinc-900 placeholder:text-zinc-400 focus:border-[#1877f2]/40 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1877f2]/12"
        >
      </label>
    </div>

    <ul class="min-h-0 flex-1 divide-y divide-zinc-100 overflow-y-auto">
      <li v-if="listLoading" class="px-4 py-10 text-center text-[14px] text-zinc-500">
        Loading…
      </li>
      <li v-else-if="!hasAnyConversations" class="px-4 py-14 text-center text-[14px] text-zinc-500">
        No conversations yet.
      </li>
      <li v-else-if="conversations.length === 0" class="px-4 py-14 text-center text-[14px] text-zinc-500">
        No results.
      </li>
      <template v-else>
        <li v-for="c in conversations" :key="c.id">
          <button
            type="button"
            class="flex w-full gap-3 border-l-[4px] py-3 pl-3 pr-3 text-left transition-colors"
            :class="
              selectedId === c.id
                ? 'border-[#1877f2] bg-zinc-50/90'
                : 'border-transparent hover:bg-zinc-50'
            "
            @click="emit('select', c.id)"
          >
            <div
              class="relative shrink-0 cursor-pointer"
              role="button"
              tabindex="0"
              aria-label="Open profile"
              @click.stop.prevent="emit('open-profile', c)"
              @keydown.enter.stop.prevent="emit('open-profile', c)"
            >
              <img
                v-if="!isAvatarBroken(c.id)"
                :src="c.peerAvatarUrl || defaultAvatarUrl"
                alt=""
                width="48"
                height="48"
                class="h-12 w-12 rounded-full object-cover shadow-sm"
                loading="lazy"
                decoding="async"
                @error="emit('avatar-error', c.id)"
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
                class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white"
                aria-hidden="true"
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
              v-if="c.unreadCount > 0"
              class="self-center flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-[#1877f2] px-1.5 text-[11px] font-bold text-white"
            >{{ c.unreadCount > 9 ? '9+' : c.unreadCount }}</span>
          </button>
        </li>
      </template>
    </ul>
  </aside>
</template>
