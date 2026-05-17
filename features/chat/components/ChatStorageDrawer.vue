<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  open: { type: Boolean, default: false },
  activeTab: { type: String, default: 'media' },
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
  senderLabel: { type: Function, default: () => 'Người gửi' },
})

const emit = defineEmits([
  'update:open',
  'update:activeTab',
  'pick-media',
  'pick-file',
  'pick-link',
  'load-more-media',
  'load-more-files',
  'load-more-links',
])

const drawerWidth = computed(() => {
  if (typeof window === 'undefined') {
    return 430
  }
  return Math.min(430, window.innerWidth)
})

const senderFilter = ref('all')
const dateFilter = ref('all')
const openFilterMenu = ref('')

function dateKeyOf(item) {
  const d = new Date(item?.createdAt || Date.now())
  if (Number.isNaN(d.getTime())) {
    return 'unknown'
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateLabelOf(item) {
  const d = new Date(item?.createdAt || Date.now())
  if (Number.isNaN(d.getTime())) {
    return 'Không rõ ngày'
  }
  return `Ngày ${String(d.getDate()).padStart(2, '0')} Tháng ${d.getMonth() + 1}`
}

function senderKeyOf(item) {
  const sid = item?.senderUserId != null ? String(item.senderUserId) : ''
  return sid || (item?.isOwn ? 'me' : 'unknown')
}

const filterSourceItems = computed(() => {
  if (props.activeTab === 'files') return props.fileItems
  if (props.activeTab === 'links') return props.linkItems
  return props.mediaItems
})

const senderOptions = computed(() => {
  const map = new Map()
  for (const item of filterSourceItems.value) {
    const key = senderKeyOf(item)
    if (!map.has(key)) {
      const label = props.senderLabel(item)
      map.set(key, String(label || 'Người gửi'))
    }
  }
  return [
    { key: 'all', label: 'Tất cả người gửi' },
    ...[...map.entries()].map(([key, label]) => ({ key, label })),
  ]
})

const dateOptions = computed(() => {
  const map = new Map()
  for (const item of filterSourceItems.value) {
    const key = dateKeyOf(item)
    if (!map.has(key)) {
      map.set(key, dateLabelOf(item))
    }
  }
  return [
    { key: 'all', label: 'Tất cả ngày' },
    ...[...map.entries()].map(([key, label]) => ({ key, label })),
  ]
})

const selectedSenderLabel = computed(() => {
  return senderOptions.value.find(item => item.key === senderFilter.value)?.label || 'Người gửi'
})

const selectedDateLabel = computed(() => {
  return dateOptions.value.find(item => item.key === dateFilter.value)?.label || 'Ngày gửi'
})

const filteredMediaItems = computed(() => {
  return props.mediaItems.filter((item) => {
    const senderOk = senderFilter.value === 'all' || senderKeyOf(item) === senderFilter.value
    const dateOk = dateFilter.value === 'all' || dateKeyOf(item) === dateFilter.value
    return senderOk && dateOk
  })
})

const filteredFileItems = computed(() => {
  return props.fileItems.filter((item) => {
    const senderOk = senderFilter.value === 'all' || senderKeyOf(item) === senderFilter.value
    const dateOk = dateFilter.value === 'all' || dateKeyOf(item) === dateFilter.value
    return senderOk && dateOk
  })
})

const filteredLinkItems = computed(() => {
  return props.linkItems.filter((item) => {
    const senderOk = senderFilter.value === 'all' || senderKeyOf(item) === senderFilter.value
    const dateOk = dateFilter.value === 'all' || dateKeyOf(item) === dateFilter.value
    return senderOk && dateOk
  })
})

const mediaGroups = computed(() => {
  const map = new Map()
  for (const item of filteredMediaItems.value) {
    const key = dateLabelOf(item)
    if (!map.has(key)) {
      map.set(key, [])
    }
    map.get(key).push(item)
  }
  return [...map.entries()].map(([label, items]) => ({ label, items }))
})

function onClose() {
  emit('update:open', false)
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

function canDownloadFile(file) {
  return file?.status === 'ready' && Boolean(file?.url)
}

function toggleFilterMenu(menu) {
  openFilterMenu.value = openFilterMenu.value === menu ? '' : menu
}

function onSenderMenuClick(key) {
  senderFilter.value = String(key)
  openFilterMenu.value = ''
}

function onDateMenuClick(key) {
  dateFilter.value = String(key)
  openFilterMenu.value = ''
}

watch(() => props.open, (open) => {
  if (!open) {
    senderFilter.value = 'all'
    dateFilter.value = 'all'
    openFilterMenu.value = ''
  }
})
</script>

<template>
  <a-drawer
    :open="open"
    placement="right"
    :width="drawerWidth"
    :closable="false"
    root-class-name="chat-storage-drawer"
    @close="onClose"
  >
    <template #title>
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="rounded-full p-2 text-zinc-600 transition hover:bg-zinc-100"
          aria-label="Quay lại"
          @click="onClose"
        >
          <i class="fa-solid fa-arrow-left text-[16px]" />
        </button>
        <span class="text-[17px] font-semibold text-zinc-900">Kho lưu trữ</span>
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-[13px] font-semibold text-zinc-600 transition hover:bg-zinc-100"
        >
          Chọn
        </button>
      </div>
    </template>

    <div class="pb-6">
      <div class="grid grid-cols-3 border-b border-zinc-200">
        <button
          type="button"
          class="relative py-3 text-[14px] font-semibold transition"
          :class="activeTab === 'media' ? 'text-[#1877f2]' : 'text-zinc-600 hover:text-zinc-900'"
          @click="emit('update:activeTab', 'media')"
        >
          Ảnh/Video
          <span
            v-if="activeTab === 'media'"
            class="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#1877f2]"
          />
        </button>
        <button
          type="button"
          class="relative py-3 text-[14px] font-semibold transition"
          :class="activeTab === 'files' ? 'text-[#1877f2]' : 'text-zinc-600 hover:text-zinc-900'"
          @click="emit('update:activeTab', 'files')"
        >
          Files
          <span
            v-if="activeTab === 'files'"
            class="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#1877f2]"
          />
        </button>
        <button
          type="button"
          class="relative py-3 text-[14px] font-semibold transition"
          :class="activeTab === 'links' ? 'text-[#1877f2]' : 'text-zinc-600 hover:text-zinc-900'"
          @click="emit('update:activeTab', 'links')"
        >
          Links
          <span
            v-if="activeTab === 'links'"
            class="absolute inset-x-0 bottom-[-1px] h-0.5 bg-[#1877f2]"
          />
        </button>
      </div>

      <div class="relative z-20 mt-4 flex gap-2">
        <div class="relative min-w-0 flex-1">
          <button
            type="button"
            class="flex w-full min-w-0 items-center justify-between rounded-full bg-zinc-100 px-3 py-2 text-left text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-200"
            @click.stop="toggleFilterMenu('sender')"
          >
            <span class="truncate">{{ selectedSenderLabel }}</span>
            <i
              class="fa-solid fa-chevron-down ml-2 shrink-0 text-[11px] transition"
              :class="openFilterMenu === 'sender' ? 'rotate-180' : ''"
            />
          </button>
          <div
            v-if="openFilterMenu === 'sender'"
            class="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
          >
            <button
              v-for="item in senderOptions"
              :key="item.key"
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-medium transition hover:bg-zinc-50"
              :class="senderFilter === item.key ? 'text-[#1877f2]' : 'text-zinc-700'"
              @click.stop="onSenderMenuClick(item.key)"
            >
              <span class="truncate">{{ item.label }}</span>
              <i
                v-if="senderFilter === item.key"
                class="fa-solid fa-check ml-2 shrink-0 text-[11px]"
              />
            </button>
          </div>
        </div>
        <div class="relative min-w-0 flex-1">
          <button
            type="button"
            class="flex w-full min-w-0 items-center justify-between rounded-full bg-zinc-100 px-3 py-2 text-left text-[13px] font-medium text-zinc-700 transition hover:bg-zinc-200"
            @click.stop="toggleFilterMenu('date')"
          >
            <span class="truncate">{{ selectedDateLabel }}</span>
            <i
              class="fa-solid fa-chevron-down ml-2 shrink-0 text-[11px] transition"
              :class="openFilterMenu === 'date' ? 'rotate-180' : ''"
            />
          </button>
          <div
            v-if="openFilterMenu === 'date'"
            class="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
          >
            <button
              v-for="item in dateOptions"
              :key="item.key"
              type="button"
              class="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] font-medium transition hover:bg-zinc-50"
              :class="dateFilter === item.key ? 'text-[#1877f2]' : 'text-zinc-700'"
              @click.stop="onDateMenuClick(item.key)"
            >
              <span class="truncate">{{ item.label }}</span>
              <i
                v-if="dateFilter === item.key"
                class="fa-solid fa-check ml-2 shrink-0 text-[11px]"
              />
            </button>
          </div>
        </div>
      </div>

      <div
        v-if="openFilterMenu"
        class="fixed inset-0 z-10"
        @click="openFilterMenu = ''"
      />

      <div v-if="activeTab === 'media'" class="relative z-0 mt-5 space-y-6">
        <div
          v-if="mediaLoading && !mediaItems.length"
          class="rounded-xl bg-zinc-50 px-3 py-8 text-center text-[13px] text-zinc-500"
        >
          <i class="fa-solid fa-spinner fa-spin mr-1 text-[12px]" />
          Đang tải ảnh…
        </div>
        <div
          v-else-if="!mediaItems.length"
          class="rounded-xl bg-zinc-50 px-3 py-8 text-center text-[13px] text-zinc-500"
        >
          Chưa có ảnh hoặc video.
        </div>
        <div
          v-else-if="!filteredMediaItems.length"
          class="rounded-xl bg-zinc-50 px-3 py-8 text-center text-[13px] text-zinc-500"
        >
          Không có ảnh phù hợp với bộ lọc.
        </div>
        <template v-else>
          <section
            v-for="group in mediaGroups"
            :key="group.label"
          >
            <h3 class="mb-3 text-[14px] font-semibold text-zinc-700">
              {{ group.label }}
            </h3>
            <div class="grid grid-cols-3 gap-2">
              <template
                v-for="item in group.items"
                :key="String(item.id)"
              >
                <button
                  v-for="(img, index) in item.images"
                  :key="mediaTileKey(item, img, index)"
                  type="button"
                  class="aspect-square overflow-hidden rounded-lg bg-zinc-200 ring-1 ring-black/5 transition hover:scale-[0.98] hover:ring-[#1877f2]/50"
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
                </button>
              </template>
            </div>
          </section>
        </template>
        <button
          v-if="mediaHasMore"
          type="button"
          class="w-full rounded-xl border border-zinc-200 bg-white py-2 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
          :disabled="mediaLoading"
          @click="emit('load-more-media')"
        >
          {{ mediaLoading ? 'Đang tải…' : 'Tải thêm' }}
        </button>
      </div>

      <div
        v-else-if="activeTab === 'files'"
        class="relative z-0 mt-5"
      >
        <div
          v-if="fileLoading && !fileItems.length"
          class="rounded-xl bg-zinc-50 px-4 py-10 text-center"
        >
          <i class="fa-solid fa-spinner fa-spin text-[18px] text-zinc-300" />
          <p class="mt-2 text-[13px] font-medium text-zinc-600">
            Đang tải file…
          </p>
        </div>
        <div
          v-else-if="!fileItems.length"
          class="rounded-xl bg-zinc-50 px-4 py-10 text-center"
        >
          <i class="fa-regular fa-file-lines text-[24px] text-zinc-300" />
          <p class="mt-2 text-[13px] font-medium text-zinc-600">
            Chưa có file để hiển thị.
          </p>
        </div>
        <div
          v-else-if="!filteredFileItems.length"
          class="rounded-xl bg-zinc-50 px-4 py-10 text-center"
        >
          <i class="fa-regular fa-file-lines text-[24px] text-zinc-300" />
          <p class="mt-2 text-[13px] font-medium text-zinc-600">
            Không có file phù hợp với bộ lọc.
          </p>
        </div>
        <div
          v-else
          class="space-y-2"
        >
          <template
            v-for="item in filteredFileItems"
            :key="String(item.id)"
          >
            <div
              v-for="(file, index) in item.files"
              :key="fileRowKey(item, file, index)"
              class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
            >
              <button
                type="button"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100"
                title="Xem trong chat"
                @click="emit('pick-file', item)"
              >
                <i
                  class="text-[22px]"
                  :class="fileIcon(file)"
                />
              </button>
              <button
                type="button"
                class="min-w-0 flex-1 text-left"
                @click="emit('pick-file', item)"
              >
                <p class="truncate text-[13px] font-semibold text-zinc-900">
                  {{ file.originalName || 'File' }}
                </p>
                <p class="mt-0.5 truncate text-[12px] text-zinc-500">
                  {{ formatFileSize(file.size) }} · {{ fileStatusText(file) }}
                </p>
                <p class="mt-0.5 truncate text-[11px] text-zinc-400">
                  {{ senderLabel(item) }} · {{ formatTime(item.createdAt) }}
                </p>
              </button>
              <a
                v-if="canDownloadFile(file)"
                :href="file.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-[#1877f2] hover:text-white"
                title="Tải xuống"
                @click.stop
              >
                <i class="fa-solid fa-arrow-down text-[13px]" />
              </a>
              <span
                v-else
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-400"
                title="Chưa thể tải xuống"
              >
                <i class="fa-solid fa-shield-halved text-[13px]" />
              </span>
            </div>
          </template>
          <button
            v-if="fileHasMore"
            type="button"
            class="w-full rounded-xl border border-zinc-200 bg-white py-2 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            :disabled="fileLoading"
            @click="emit('load-more-files')"
          >
            {{ fileLoading ? 'Đang tải…' : 'Tải thêm' }}
          </button>
        </div>
      </div>

      <div
        v-else
        class="relative z-0 mt-5"
      >
        <div
          v-if="linkLoading && !linkItems.length"
          class="rounded-xl bg-zinc-50 px-4 py-10 text-center"
        >
          <i class="fa-solid fa-spinner fa-spin text-[18px] text-zinc-300" />
          <p class="mt-2 text-[13px] font-medium text-zinc-600">Đang tải link…</p>
        </div>
        <div
          v-else-if="!linkItems.length"
          class="rounded-xl bg-zinc-50 px-4 py-10 text-center"
        >
          <i class="fa-solid fa-link text-[24px] text-zinc-300" />
          <p class="mt-2 text-[13px] font-medium text-zinc-600">Chưa có link để hiển thị.</p>
        </div>
        <div
          v-else-if="!filteredLinkItems.length"
          class="rounded-xl bg-zinc-50 px-4 py-10 text-center"
        >
          <i class="fa-solid fa-link text-[24px] text-zinc-300" />
          <p class="mt-2 text-[13px] font-medium text-zinc-600">Không có link phù hợp với bộ lọc.</p>
        </div>
        <div v-else class="space-y-2">
          <template v-for="item in filteredLinkItems" :key="String(item.id)">
            <div
              v-for="(link, index) in item.links"
              :key="linkRowKey(item, link, index)"
              class="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm"
            >
              <button
                type="button"
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500"
                title="Xem trong chat"
                @click="emit('pick-link', item)"
              >
                <i class="fa-solid fa-link text-[18px]" />
              </button>
              <button type="button" class="min-w-0 flex-1 text-left" @click="emit('pick-link', item)">
                <p class="truncate text-[13px] font-semibold text-zinc-900">
                  {{ link.title || link.url }}
                </p>
                <p class="mt-0.5 truncate text-[12px] text-zinc-500">
                  {{ link.domain || link.url }}
                </p>
                <p class="mt-0.5 truncate text-[11px] text-zinc-400">
                  {{ senderLabel(item) }} · {{ formatTime(item.createdAt) }}
                </p>
              </button>
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600 transition hover:bg-[#1877f2] hover:text-white"
                title="Mở link"
                @click.stop
              >
                <i class="fa-solid fa-arrow-up-right-from-square text-[12px]" />
              </a>
            </div>
          </template>
          <button
            v-if="linkHasMore"
            type="button"
            class="w-full rounded-xl border border-zinc-200 bg-white py-2 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            :disabled="linkLoading"
            @click="emit('load-more-links')"
          >
            {{ linkLoading ? 'Đang tải…' : 'Tải thêm' }}
          </button>
        </div>
      </div>
    </div>
  </a-drawer>
</template>
