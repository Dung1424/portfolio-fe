<script setup>
import { ref } from 'vue'

const props = defineProps({
  pinnedMessages: { type: Array, default: () => [] },
  /** (pinLike) => string */
  bannerPreview: { type: Function, required: true },
})

const emit = defineEmits(['banner-click', 'unpin-all', 'unpin'])

const pinnedListExpanded = ref(false)
const pinnedHeaderMenuOpen = ref(false)
const pinnedRowMenuForId = ref(null)

function togglePinnedListExpand() {
  pinnedListExpanded.value = !pinnedListExpanded.value
  pinnedHeaderMenuOpen.value = false
  pinnedRowMenuForId.value = null
}

function togglePinnedHeaderMenu() {
  pinnedHeaderMenuOpen.value = !pinnedHeaderMenuOpen.value
  pinnedRowMenuForId.value = null
}

function togglePinnedRowMenu(messageId) {
  const id = String(messageId ?? '')
  pinnedRowMenuForId.value = pinnedRowMenuForId.value === id ? null : id
  pinnedHeaderMenuOpen.value = false
}

function isPinnedRowMenuOpen(messageId) {
  return pinnedRowMenuForId.value === String(messageId ?? '')
}

function onBannerClick(pin) {
  pinnedRowMenuForId.value = null
  pinnedHeaderMenuOpen.value = false
  emit('banner-click', pin)
}

function onUnpinAll() {
  pinnedHeaderMenuOpen.value = false
  emit('unpin-all')
}

function collapseExpanded() {
  pinnedListExpanded.value = false
}
</script>

<template>
  <div
    v-if="pinnedMessages?.length"
    class="border-b border-zinc-200/90 bg-[#f0f2f5] px-2 py-1.5 sm:px-4"
  >
    <div
      class="flex items-stretch gap-2 rounded-xl border border-zinc-200/90 bg-white px-2 py-2 text-zinc-900 shadow-sm sm:gap-2.5 sm:px-3"
    >
      <div
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#1877f2] sm:h-11 sm:w-11"
        aria-hidden="true"
      >
        <i class="fa-solid fa-thumbtack text-[14px] text-white sm:text-[15px]" />
      </div>
      <button
        type="button"
        class="min-w-0 flex-1 text-left transition hover:opacity-90"
        @click="onBannerClick(pinnedMessages[0])"
      >
        <p class="text-[13px] font-semibold leading-tight text-zinc-900">
          Pinned message
        </p>
        <p class="mt-0.5 line-clamp-1 text-[12px] leading-snug text-zinc-500">
          <template v-if="pinnedMessages[0]?.unavailable">
            {{ pinnedMessages[0]?.unavailableReason || 'This message is no longer available.' }}
          </template>
          <template v-else>
            {{ bannerPreview(pinnedMessages[0]) }}
          </template>
        </p>
      </button>
      <div class="flex shrink-0 items-center gap-0.5">
        <button
          v-if="pinnedMessages.length > 1"
          type="button"
          class="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1.5 text-[12px] font-medium text-zinc-700 transition hover:bg-zinc-100"
          @click.stop="togglePinnedListExpand"
        >
          +{{ pinnedMessages.length - 1 }} pinned
          <i
            class="fa-solid text-[10px] text-zinc-500"
            :class="pinnedListExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"
            aria-hidden="true"
          />
        </button>
        <div class="relative">
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100"
            aria-label="Pinned messages options"
            @click.stop="togglePinnedHeaderMenu"
          >
            <i class="fa-solid fa-ellipsis text-[15px]" />
          </button>
          <div
            v-if="pinnedHeaderMenuOpen"
            class="absolute right-0 top-full z-30 mt-1 w-52 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-[13px] text-zinc-800 shadow-xl"
            @click.stop
          >
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-zinc-50"
              @click="togglePinnedListExpand"
            >
              <i class="fa-solid fa-list w-4 text-center text-zinc-500" />
              <span>{{ pinnedListExpanded ? 'Collapse list' : 'View pinned list' }}</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-rose-600 hover:bg-rose-50"
              @click="onUnpinAll"
            >
              <i class="fa-solid fa-thumbtack w-4 rotate-45 text-center text-[11px]" />
              <span>Unpin all</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="pinnedListExpanded"
      class="mt-2 overflow-hidden rounded-xl border border-zinc-200/90 bg-white shadow-md"
    >
      <div class="flex items-center justify-between gap-2 border-b border-zinc-100 px-3 py-2.5">
        <span class="text-[14px] font-semibold text-zinc-900">
          Pinned messages ({{ pinnedMessages.length }})
        </span>
        <button
          type="button"
          class="inline-flex items-center gap-1 text-[13px] font-medium text-[#1877f2] transition hover:underline"
          @click="collapseExpanded"
        >
          Collapse
          <i class="fa-solid fa-chevron-up text-[11px]" aria-hidden="true" />
        </button>
      </div>
      <ul class="max-h-[min(50vh,16rem)] divide-y divide-zinc-100 overflow-y-auto">
        <li
          v-for="pin in pinnedMessages"
          :key="String(pin.messageId)"
          class="relative"
        >
          <button
            type="button"
            class="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-zinc-50"
            @click="onBannerClick(pin)"
          >
            <div
              class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877f2]/12"
              aria-hidden="true"
            >
              <i class="fa-solid fa-thumbtack text-[12px] text-[#1877f2]" />
            </div>
            <div class="min-w-0 flex-1 pr-9">
              <p class="text-[13px] font-semibold text-zinc-900">
                Pinned message
              </p>
              <p class="mt-0.5 line-clamp-2 text-[12px] leading-snug text-zinc-600">
                <template v-if="pin.unavailable">
                  {{ pin.unavailableReason || 'This message is no longer available.' }}
                </template>
                <template v-else>
                  {{ bannerPreview(pin) }}
                </template>
              </p>
            </div>
          </button>
          <div class="absolute right-2 top-2">
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-zinc-800"
              aria-label="Pinned message actions"
              @click.stop="togglePinnedRowMenu(pin.messageId)"
            >
              <i class="fa-solid fa-ellipsis text-[14px]" />
            </button>
            <div
              v-if="isPinnedRowMenuOpen(pin.messageId)"
              class="absolute right-0 top-full z-30 mt-0.5 w-40 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 text-[13px] shadow-xl"
              @click.stop
            >
              <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
                @click="emit('unpin', pin)"
              >
                <i class="fa-solid fa-thumbtack rotate-45 text-[11px]" />
                <span>Unpin</span>
              </button>
            </div>
          </div>
        </li>
      </ul>
      <div class="border-t border-zinc-100 px-3 py-2 text-center">
        <p class="text-[12px] text-zinc-500">
          Tap a row to jump to that message in the chat.
        </p>
      </div>
    </div>
  </div>
</template>
