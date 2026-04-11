<template>
  <div class="space-y-4">
    <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
      <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyFilters">
        <a-form-item label="Title">
          <a-input v-model:value="filters.title" allow-clear placeholder="Title" style="width: 160px" />
        </a-form-item>
        <a-form-item label="Location">
          <a-input v-model:value="filters.location" allow-clear placeholder="Location" style="width: 140px" />
        </a-form-item>
        <a-form-item label="Category">
          <a-select
            v-model:value="filters.category_id"
            allow-clear
            placeholder="Any"
            style="width: 160px"
            :options="categoryOptions"
          />
        </a-form-item>
        <a-form-item label="Privacy">
          <a-select
            v-model:value="filters.privacy_status"
            allow-clear
            placeholder="Any"
            style="width: 120px"
            :options="[
              { value: false, label: 'Public' },
              { value: true, label: 'Private' }
            ]"
          />
        </a-form-item>
        <a-form-item label="From">
          <a-date-picker v-model:value="filters.start_date" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="To">
          <a-date-picker v-model:value="filters.end_date" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="button" @click="applyFilters">
            Apply
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :title="cardTitle">
      <a-spin :spinning="loading">
        <a-table
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          :scroll="{ x: listMode === 'pending' || listMode === 'rejected' ? 1350 : 1250 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'thumb'">
              <div class="h-12 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <img
                  v-if="photoImageUrl(record)"
                  :src="photoImageUrl(record)"
                  :alt="record.title || 'Photo'"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                  No image
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'title'">
              <div class="max-w-[240px]">
                <p class="truncate font-medium text-slate-800">
                  {{ record.title || '—' }}
                </p>
                <p class="truncate text-xs text-slate-500">
                  {{ record.description || '—' }}
                </p>
              </div>
            </template>
            <template v-else-if="column.key === 'location'">
              <span class="text-slate-700">{{ record.location || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'privacy_status'">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                :class="privacyBadgeClass(record.privacy_status)"
              >
                {{ privacyLabel(record.privacy_status) }}
              </span>
            </template>
            <template v-else-if="column.key === 'photo_status'">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset"
                :class="photoStatusBadgeClass(record.photo_status)"
              >
                {{ record.photo_status || '—' }}
              </span>
            </template>
            <template v-else-if="column.key === 'upload_date'">
              <span class="text-slate-700">{{ formatUploadDate(record.upload_date) }}</span>
            </template>
            <template v-else-if="column.key === 'user'">
              <div class="flex min-w-0 items-center gap-2">
                <img
                  v-if="userAvatarUrl(record.user)"
                  :src="userAvatarUrl(record.user)"
                  :alt="record.user?.username || 'User'"
                  class="h-8 w-8 rounded-full border border-slate-200 object-cover"
                >
                <div
                  v-else
                  class="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-[11px] font-semibold text-slate-500"
                >
                  {{ userInitial(record.user) }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-800">
                    {{ record.user?.name || record.user?.username || 'Unknown' }}
                  </p>
                  <p class="truncate text-xs text-slate-500">
                    {{ record.user?.email || record.user_id || '—' }}
                  </p>
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space v-if="listMode === 'pending'" size="small">
                <a-button
                  type="text"
                  class="admin-table-icon-btn !text-emerald-600 hover:!text-emerald-700"
                  title="Duyệt"
                  :loading="statusPatchingId === record.id"
                  :disabled="statusPatchingId != null && statusPatchingId !== record.id"
                  @click="applyPhotoStatus(record, 'approved')"
                >
                  <i class="fa-solid fa-circle-check text-base" aria-hidden="true" />
                </a-button>
                <a-button
                  type="text"
                  danger
                  class="admin-table-icon-btn"
                  title="Từ chối"
                  :loading="statusPatchingId === record.id"
                  :disabled="statusPatchingId != null && statusPatchingId !== record.id"
                  @click="applyPhotoStatus(record, 'rejected')"
                >
                  <i class="fa-solid fa-circle-xmark text-base" aria-hidden="true" />
                </a-button>
              </a-space>
              <a-button
                v-else-if="listMode === 'rejected'"
                type="text"
                class="admin-table-icon-btn"
                title="Xem chi tiết"
                @click="openDetailModal(record.id)"
              >
                <i class="fa-solid fa-eye text-base" aria-hidden="true" />
              </a-button>
            </template>
          </template>
        </a-table>
        <AdminPager
          v-bind="pagerMeta"
          item-label="ảnh"
          :loading="loading"
          @update:page="fetchList"
          @update:page-size="onPageSize"
        />
      </a-spin>
    </a-card>

    <AdminModal
      v-model="detailModalOpen"
      :title="detailModalTitle"
      size="wide"
      @close="closeDetailModal"
    >
      <PhotoViewPanel
        v-if="detailPhotoId"
        variant="modal"
        :photo-id="detailPhotoId"
      />
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { notification } from 'ant-design-vue'
import { photosAdminApi } from '~/features/admin/photos/services/photos.api.js'
import {
  categoriesAdminApi,
  categoriesListFromAdminBody
} from '~/features/admin/categories/services/categories.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultPhotoAdminListFilters,
  buildPhotoAdminListCursorQuery
} from '~/composables/adminCursorListPresets'
import PhotoViewPanel from '~/features/admin/photos/components/PhotoViewPanel.vue'
import { privacyLabel, privacyBadgeClass, photoStatusBadgeClass } from '~/composables/photoAdminBadges'

const props = defineProps({
  listMode: {
    type: String,
    required: true,
    validator: (v) => v === 'pending' || v === 'rejected'
  }
})

const runtimeConfig = useRuntimeConfig()
const { showFromError } = useApiErrorMessage()

const cardTitle = computed(() =>
  props.listMode === 'pending' ? 'Pending photos' : 'Rejected photos'
)

const categories = ref([])
const statusPatchingId = ref(null)

const detailModalOpen = ref(false)
const detailPhotoId = ref(null)
const detailModalTitle = computed(() =>
  detailPhotoId.value ? 'Chi tiết ảnh' : ''
)

function openDetailModal(id) {
  detailPhotoId.value = id
  detailModalOpen.value = true
}

function closeDetailModal() {
  detailModalOpen.value = false
  detailPhotoId.value = null
}

const filters = ref(defaultPhotoAdminListFilters())

const {
  loading,
  rows,
  pagerMeta,
  lastListPage,
  fetchList,
  applyFilters,
  onPageSize
} = useAdminCursorList({
  filters,
  itemsKey: 'photos',
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildPhotoAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const api =
      props.listMode === 'pending'
        ? photosAdminApi.pendingPhotos
        : photosAdminApi.rejectedPhotos
    const { data } = await api(q)
    return data
  }
})

const categoryOptions = computed(() =>
  (categories.value || []).map((c) => ({
    value: String(c.id),
    label: c.category_name || c.name || 'Untitled category'
  }))
)

const columns = computed(() => {
  const base = [
    { title: 'Image', key: 'thumb', width: 90 },
    { title: 'Photo', dataIndex: 'title', key: 'title', ellipsis: true, width: 260 },
    { title: 'Location', dataIndex: 'location', key: 'location', ellipsis: true, width: 150 },
    { title: 'Uploaded', dataIndex: 'upload_date', key: 'upload_date', width: 170 },
    { title: 'User', key: 'user', width: 230 },
    { title: 'Privacy', dataIndex: 'privacy_status', key: 'privacy_status', width: 110 },
    { title: 'Status', dataIndex: 'photo_status', key: 'photo_status', width: 110 },
    { title: 'Views', dataIndex: 'total_views', key: 'total_views', width: 90 }
  ]
  if (props.listMode === 'pending') {
    return [...base, { title: '', key: 'action', width: 100, fixed: 'right' }]
  }
  if (props.listMode === 'rejected') {
    return [...base, { title: '', key: 'action', width: 72, fixed: 'right' }]
  }
  return base
})

const mediaBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, ''))

function photoImageUrl(record) {
  const path = record?.image_url || record?.url || record?.photo_url || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
}

function userAvatarUrl(user) {
  const path = user?.profile_picture || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
}

function userInitial(user) {
  const base = String(user?.name || user?.username || '?').trim()
  return base ? base.charAt(0).toUpperCase() : '?'
}

function formatUploadDate(v) {
  if (!v) {
    return '—'
  }
  const s = String(v).trim()
  const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : s
}

async function loadFilterCategories() {
  try {
    const { data } = await categoriesAdminApi.categories({ chunkSize: 100 })
    categories.value = categoriesListFromAdminBody(data)
  } catch {
    categories.value = []
  }
}

async function applyPhotoStatus(record, status) {
  const id = record?.id
  if (!id || statusPatchingId.value) {
    return
  }
  statusPatchingId.value = id
  try {
    await photosAdminApi.patchPhotoStatus(id, status)
    notification.success({
      message: 'Thành công',
      description:
        status === 'approved'
          ? 'Đã duyệt ảnh.'
          : 'Đã từ chối ảnh.'
    })
    await fetchList(lastListPage.value)
  } catch (e) {
    showFromError(e)
  } finally {
    statusPatchingId.value = null
  }
}

onMounted(() => {
  fetchList(1)
  loadFilterCategories()
})
</script>
