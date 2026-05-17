<script setup>
import { computed } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  conversation: { type: Object, default: null },
  defaultAvatarUrl: { type: String, required: true },
  mediaItems: { type: Array, default: () => [] },
  mediaLoading: { type: Boolean, default: false },
  mediaHasMore: { type: Boolean, default: false },
  fileItems: { type: Array, default: () => [] },
  fileLoading: { type: Boolean, default: false },
  fileHasMore: { type: Boolean, default: false },
  linkItems: { type: Array, default: () => [] },
  linkLoading: { type: Boolean, default: false },
  linkHasMore: { type: Boolean, default: false },
  formatTime: { type: Function, required: true },
})

const emit = defineEmits([
  'update:open',
  'open-profile',
  'pick-media',
  'pick-file',
  'pick-link',
  'load-more-media',
  'open-storage',
  'clear-history',
])

const drawerWidth = computed(() => {
  if (typeof window === 'undefined') {
    return 400
  }
  return Math.min(400, window.innerWidth)
})

const mediaPreviewItems = computed(() => props.mediaItems.slice(0, 8))
const filePreviewItems = computed(() => props.fileItems.slice(0, 3))
const linkPreviewItems = computed(() => props.linkItems.slice(0, 3))

function onClose() {
  emit('update:open', false)
}

function avatarSrc() {
  return props.conversation?.peerAvatarUrl || props.defaultAvatarUrl
}

function mediaTileKey(item, img, index) {
  return `${String(item?.id ?? 'msg')}-${String(img?.objectKey || img?.url || index)}`
}

function fileRowKey(item, file, index) {
  return `${String(item?.id ?? 'msg')}-${String(file?.objectKey || file?.originalName || index)}`
}

function linkRowKey(item, link, index) {
  return `${String(item?.id ?? 'msg')}-${String(link?.normalizedUrl || link?.url || index)}`
}

function fileIcon(file) {
  const ext = String(file?.extension || '').toLowerCase()
  if (['doc', 'docx'].includes(ext)) return 'fa-regular fa-file-word text-blue-600'
  if (['xls', 'xlsx'].includes(ext)) return 'fa-regular fa-file-excel text-emerald-600'
  if (['ppt', 'pptx'].includes(ext)) return 'fa-regular fa-file-powerpoint text-orange-600'
  if (['mp4', 'mov'].includes(ext)) return 'fa-solid fa-file-video text-violet-600'
  return 'fa-regular fa-file-lines text-zinc-500'
}

function formatFileSize(bytes) {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = n
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`
}

function fileStatusText(file) {
  if (file?.status === 'ready') return 'Sẵn sàng tải xuống'
  if (file?.status === 'blocked') return 'File bị chặn'
  if (file?.status === 'failed') return 'Kiểm tra file thất bại'
  return 'Đang kiểm tra file'
}
</script>

<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="drawerWidth"
    :closable="false"
    :body-style="{ padding: '14px', background: '#f8fafc' }"
    root-class-name="chat-direct-details-drawer"
    @close="onClose"
  >
    <template #title>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
          aria-label="Đóng"
          @click="onClose"
        >
          <i class="fa-solid fa-arrow-left text-[16px]" />
        </button>
        <span class="text-[16px] font-semibold text-zinc-900">Thông tin hội thoại</span>
      </div>
    </template>

    <div v-if="conversation" class="space-y-3 pb-6">
      <section class="rounded-2xl border border-zinc-200/80 bg-white p-4 text-center shadow-sm">
        <img
          :src="avatarSrc()"
          alt=""
          width="84"
          height="84"
          class="mx-auto h-[84px] w-[84px] rounded-2xl object-cover ring-1 ring-zinc-200"
        >
        <h2 class="mt-3 truncate text-[18px] font-bold text-zinc-900">
          {{ conversation.name }}
        </h2>
        <p
          v-if="conversation.username"
          class="mt-0.5 truncate text-[13px] text-zinc-500"
        >
          @{{ conversation.username }}
        </p>
        <button
          type="button"
          class="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-[#1877f2] px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-[#166fe5]"
          @click="emit('open-profile', conversation)"
        >
          <i class="fa-regular fa-user text-[12px]" />
          Xem trang cá nhân
        </button>
      </section>

      <section class="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 text-[15px] font-bold text-zinc-900">
            <i class="fa-regular fa-images text-[13px] text-[#1877f2]" />
            Ảnh/Video
          </h3>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Mở kho ảnh"
            @click="emit('open-storage', 'media')"
          >
            <i class="fa-solid fa-chevron-down text-[12px]" />
          </button>
        </div>
        <div
          v-if="mediaLoading && !mediaItems.length"
          class="rounded-lg bg-zinc-50 px-3 py-6 text-center text-[13px] text-zinc-500"
        >
          <i class="fa-solid fa-spinner fa-spin mr-1 text-[12px]" />
          Đang tải ảnh…
        </div>
        <div
          v-else-if="!mediaItems.length"
          class="rounded-lg bg-zinc-50 px-3 py-6 text-center"
        >
          <i class="fa-regular fa-images text-[22px] text-zinc-300" />
          <p class="mt-2 text-[13px] text-zinc-500">
            Chưa có ảnh nào trong hội thoại này.
          </p>
        </div>
        <div v-else class="grid grid-cols-4 gap-1.5">
          <template
            v-for="item in mediaPreviewItems"
            :key="String(item.id)"
          >
            <button
              v-for="(img, index) in item.images"
              :key="mediaTileKey(item, img, index)"
              type="button"
              class="group relative aspect-square overflow-hidden rounded-xl bg-zinc-200 ring-1 ring-black/5 transition hover:scale-[0.98] hover:ring-[#1877f2]/50"
              :title="formatTime(item.createdAt)"
              @click="emit('pick-media', item)"
            >
              <img
                :src="img.url"
                alt=""
                class="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              >
              <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent px-1.5 pb-1 pt-4 text-[9px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                {{ formatTime(item.createdAt) }}
              </span>
            </button>
          </template>
        </div>
        <button
          v-if="mediaItems.length || mediaHasMore"
          type="button"
          class="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-[13px] font-bold text-zinc-800 transition hover:bg-zinc-200"
          @click="emit('open-storage', 'media')"
        >
          Xem tất cả
        </button>
      </section>

      <section class="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 text-[15px] font-bold text-zinc-900">
            <i class="fa-regular fa-file-lines text-[13px] text-zinc-500" />
            Files
          </h3>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Mở kho file"
            @click="emit('open-storage', 'files')"
          >
            <i class="fa-solid fa-chevron-right text-[12px]" />
          </button>
        </div>
        <div
          v-if="fileLoading && !fileItems.length"
          class="rounded-lg bg-zinc-50 px-3 py-6 text-center text-[13px] text-zinc-500"
        >
          <i class="fa-solid fa-spinner fa-spin mr-1 text-[12px]" />
          Đang tải file…
        </div>
        <div
          v-else-if="!fileItems.length"
          class="rounded-lg bg-zinc-50 px-3 py-6 text-center"
        >
          <i class="fa-regular fa-file-lines text-[22px] text-zinc-300" />
          <p class="mt-2 text-[13px] text-zinc-500">
            Chưa có file nào trong hội thoại này.
          </p>
        </div>
        <div
          v-else
          class="space-y-2"
        >
          <template
            v-for="item in filePreviewItems"
            :key="String(item.id)"
          >
            <button
              v-for="(file, index) in item.files"
              :key="fileRowKey(item, file, index)"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-2 text-left transition hover:bg-zinc-100"
              @click="emit('pick-file', item)"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-zinc-200">
                <i
                  class="text-[20px]"
                  :class="fileIcon(file)"
                />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-semibold text-zinc-900">
                  {{ file.originalName || 'File' }}
                </span>
                <span class="mt-0.5 block truncate text-[12px] text-zinc-500">
                  {{ formatFileSize(file.size) }} · {{ fileStatusText(file) }}
                </span>
              </span>
            </button>
          </template>
        </div>
        <button
          v-if="fileItems.length || fileHasMore"
          type="button"
          class="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-[13px] font-bold text-zinc-800 transition hover:bg-zinc-200"
          @click="emit('open-storage', 'files')"
        >
          Xem tất cả
        </button>
      </section>

      <section class="rounded-2xl border border-zinc-200/80 bg-white p-3 shadow-sm">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="flex items-center gap-2 text-[15px] font-bold text-zinc-900">
            <i class="fa-solid fa-link text-[13px] text-zinc-500" />
            Links
          </h3>
          <button
            type="button"
            class="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Mở kho link"
            @click="emit('open-storage', 'links')"
          >
            <i class="fa-solid fa-chevron-right text-[12px]" />
          </button>
        </div>
        <div
          v-if="linkLoading && !linkItems.length"
          class="rounded-lg bg-zinc-50 px-3 py-6 text-center text-[13px] text-zinc-500"
        >
          <i class="fa-solid fa-spinner fa-spin mr-1 text-[12px]" />
          Đang tải link…
        </div>
        <div
          v-else-if="!linkItems.length"
          class="rounded-lg bg-zinc-50 px-3 py-6 text-center"
        >
          <i class="fa-solid fa-link text-[22px] text-zinc-300" />
          <p class="mt-2 text-[13px] text-zinc-500">
            Chưa có link nào trong hội thoại này.
          </p>
        </div>
        <div v-else class="space-y-2">
          <template
            v-for="item in linkPreviewItems"
            :key="String(item.id)"
          >
            <button
              v-for="(link, index) in item.links"
              :key="linkRowKey(item, link, index)"
              type="button"
              class="flex w-full items-center gap-3 rounded-xl bg-zinc-50 p-2 text-left transition hover:bg-zinc-100"
              @click="emit('pick-link', item)"
            >
              <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-zinc-500 ring-1 ring-zinc-200">
                <i class="fa-solid fa-link text-[17px]" />
              </span>
              <span class="min-w-0 flex-1">
                <span class="block truncate text-[13px] font-semibold text-zinc-900">
                  {{ link.title || link.url }}
                </span>
                <span class="mt-0.5 block truncate text-[12px] text-zinc-500">
                  {{ link.domain || link.url }}
                </span>
              </span>
            </button>
          </template>
        </div>
        <button
          v-if="linkItems.length || linkHasMore"
          type="button"
          class="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-[13px] font-bold text-zinc-800 transition hover:bg-zinc-200"
          @click="emit('open-storage', 'links')"
        >
          Xem tất cả
        </button>
      </section>

      <section class="rounded-2xl border border-rose-100 bg-white p-1 shadow-sm">
        <button
          type="button"
          class="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[14px] font-semibold text-rose-600 transition hover:bg-rose-50"
          @click="emit('clear-history')"
        >
          <i class="fa-regular fa-trash-can text-[12px]" />
          Xóa lịch sử trò chuyện
        </button>
      </section>
    </div>
  </a-drawer>
</template>
