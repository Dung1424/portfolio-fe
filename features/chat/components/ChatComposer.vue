<script setup>
import { computed, ref } from 'vue'
import { STICKER_PACK_IDS, STICKER_PACK_LABELS } from '~/features/chat/composables/useChatStickerPicker.js'

const props = defineProps({
  messagingGateBannerText: { type: String, default: '' },
  peerTyping: { type: Boolean, default: false },
  peerName: { type: String, default: '' },
  stickerPickerOpen: { type: Boolean, default: false },
  stickerPackActive: { type: String, default: 'sticker1' },
  stickerRows: { type: Array, default: () => [] },
  pendingChatImage: { type: Object, default: null },
  replyTo: { type: Object, default: null },
  draft: { type: String, default: '' },
  messagingAllowed: { type: Boolean, default: true },
  sendPending: { type: Boolean, default: false },
})

const emit = defineEmits([
  'update:draft',
  'submit',
  'composer-input',
  'composer-blur',
  'composer-keydown',
  'toggle-sticker-picker',
  'select-sticker-pack',
  'send-sticker',
  'sticker-image-error',
  'clear-pending-image',
  'clear-reply',
  'image-selected',
])

const draftModel = computed({
  get: () => props.draft,
  set: v => emit('update:draft', v),
})

/** Giữ ref trong cùng component — truyền ref qua prop từ cha bị Vue unwrap nên `.click()` từ composable không còn element. */
const chatImageFileInput = ref(null)

function openChatImagePicker() {
  if (!props.messagingAllowed) {
    return
  }
  chatImageFileInput.value?.click()
}
</script>

<template>
  <div class="border-t border-zinc-200 bg-white px-4 py-3 sm:px-5">
    <div
      v-if="messagingGateBannerText"
      class="mb-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-950"
      role="status"
    >
      {{ messagingGateBannerText }}
    </div>
    <div
      v-if="peerTyping"
      class="mb-2 flex items-center gap-2 px-1 text-[12px] text-zinc-500"
    >
      <div class="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-1">
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.3s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400 [animation-delay:-0.15s]" />
        <span class="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-400" />
      </div>
      <span>{{ peerName }} is typing...</span>
    </div>
    <input
      ref="chatImageFileInput"
      type="file"
      class="fixed left-0 top-0 h-px w-px opacity-0"
      tabindex="-1"
      aria-hidden="true"
      accept="image/jpeg,image/png,image/gif,image/webp"
      @change="emit('image-selected', $event)"
    >
    <form @submit.prevent="emit('submit')">
      <div
        v-if="stickerPickerOpen"
        class="mb-2 overflow-hidden rounded-2xl border border-zinc-200/90 bg-white shadow-sm"
      >
        <div class="flex items-center gap-1 border-b border-zinc-100 px-2 py-2">
          <button
            v-for="pack in STICKER_PACK_IDS"
            :key="pack"
            type="button"
            class="rounded-full px-3 py-1 text-[12px] font-medium transition"
            :class="stickerPackActive === pack ? 'bg-[#1877f2] text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'"
            @click="emit('select-sticker-pack', pack)"
          >
            {{ STICKER_PACK_LABELS[pack] || pack }}
          </button>
        </div>
        <div class="max-h-56 overflow-y-auto p-2">
          <p
            v-if="!stickerRows.length"
            class="px-2 py-6 text-center text-[12px] text-zinc-500"
          >
            No stickers found in <code>/{{ stickerPackActive }}/manifest.json</code>.
          </p>
          <div v-else class="grid grid-cols-5 gap-1.5 sm:grid-cols-6">
            <button
              v-for="sticker in stickerRows"
              :key="sticker.id"
              type="button"
              class="rounded-xl bg-zinc-50 p-1.5 transition hover:bg-zinc-100"
              @click="emit('send-sticker', sticker)"
            >
              <img
                :src="sticker.url"
                alt=""
                class="h-14 w-full object-contain sm:h-16"
                loading="lazy"
                decoding="async"
                @error="emit('sticker-image-error', sticker)"
              >
            </button>
          </div>
        </div>
      </div>
      <div
        v-if="pendingChatImage"
        class="mb-2 flex items-center gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50 p-2"
      >
        <img
          :src="pendingChatImage.previewUrl"
          alt=""
          class="h-14 w-14 rounded-lg object-cover"
        >
        <span class="flex-1 text-[13px] text-zinc-600">Ready to send</span>
        <button
          type="button"
          class="rounded-full px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-200/80"
          @click="emit('clear-pending-image')"
        >
          Remove
        </button>
      </div>
      <div
        v-if="replyTo"
        class="mb-2 flex items-start gap-2 rounded-xl border border-zinc-200/90 bg-zinc-50 p-2"
      >
        <div class="min-w-0 flex-1">
          <p class="text-[12px] font-semibold text-zinc-700">
            Replying
          </p>
          <p class="mt-0.5 line-clamp-2 text-[13px] text-zinc-600">
            {{ replyTo.text || (replyTo.imageUrl ? '[Attachment]' : '') }}
          </p>
        </div>
        <button
          type="button"
          class="rounded-full px-2 py-1 text-[12px] text-zinc-500 hover:bg-zinc-200/80"
          @click="emit('clear-reply')"
        >
          Remove
        </button>
      </div>
      <div
        class="composer-bar flex min-h-[48px] items-center gap-1.5 rounded-full border border-zinc-200/90 bg-[#f0f2f5] py-1.5 pl-2.5 pr-2 transition focus-within:border-[#1877f2]/35 focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(24,119,242,0.12)]"
      >
        <button
          type="button"
          class="composer-icon-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-[#1877f2]"
          aria-label="Attach photo"
          :disabled="!messagingAllowed"
          @click="openChatImagePicker"
        >
          <i class="fa-solid fa-plus text-[18px] leading-none" />
        </button>
        <button
          type="button"
          class="composer-icon-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-200/80 hover:text-[#1877f2]"
          aria-label="Open sticker picker"
          :disabled="!messagingAllowed"
          @click="emit('toggle-sticker-picker')"
        >
          <i class="fa-regular fa-face-smile text-[18px] leading-none" />
        </button>
        <textarea
          v-model="draftModel"
          rows="1"
          placeholder="Message"
          autocomplete="off"
          class="min-h-[40px] max-h-28 min-w-0 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-2.5 align-middle text-[15px] leading-[1.35] text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-0"
          :disabled="!messagingAllowed"
          @input="emit('composer-input', $event)"
          @blur="emit('composer-blur')"
          @keydown="emit('composer-keydown', $event)"
        />
        <button
          type="submit"
          class="composer-send flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1877f2] text-[14px] text-white shadow-sm transition hover:bg-[#166fe5] active:scale-[0.96] disabled:cursor-not-allowed disabled:bg-[#e4e6eb] disabled:text-[#bcc0c4] disabled:shadow-none"
          :disabled="!messagingAllowed || ((!draft.trim() && !pendingChatImage) || sendPending)"
          aria-label="Send"
        >
          <i class="fa-solid fa-arrow-up leading-none" />
        </button>
      </div>
    </form>
  </div>
</template>
