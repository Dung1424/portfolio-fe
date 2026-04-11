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

    <a-card title="Approved photos">
      <div class="admin-toolbar">
        <a-button type="primary" size="large" class="!h-10 !rounded-lg !px-5 !font-semibold" @click="createOpen = true">
          <i class="fa-solid fa-plus mr-2 opacity-90" aria-hidden="true" />
          Add photo
        </a-button>
      </div>
      <a-spin :spinning="loading">
        <a-table
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          :scroll="{ x: 1350 }"
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
            <template v-if="column.key === 'action'">
              <a-space size="small">
                <a-button type="text" class="admin-table-icon-btn" title="Edit" @click="openPhotoModal(record.id)">
                  <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
                </a-button>
                <a-button type="text" danger class="admin-table-icon-btn" title="Delete" @click="confirmDeletePhoto(record)">
                  <i class="fa-solid fa-trash-can" aria-hidden="true" />
                </a-button>
              </a-space>
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
      v-model="createOpen"
      title="Add photo"
      size="lg"
      @close="resetCreate"
    >
      <a-form layout="vertical" class="mt-1" :model="createForm" @finish="submitCreate">
        <a-form-item label="Title" name="title" :rules="[{ required: true, message: 'Please enter a title' }]">
          <a-input v-model:value="createForm.title" size="large" />
        </a-form-item>
        <a-form-item label="Description" name="description">
          <a-textarea v-model:value="createForm.description" :rows="3" />
        </a-form-item>
        <a-form-item label="Location" name="location">
          <a-input v-model:value="createForm.location" />
        </a-form-item>
        <a-form-item label="Image">
          <div class="space-y-3">
            <div
              v-if="createPreviewUrl"
              class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <img
                :src="createPreviewUrl"
                alt="Selected photo preview"
                class="max-h-52 w-full object-contain"
              >
            </div>
            <label class="admin-file-input">
              <input ref="createImgRef" class="sr-only" type="file" accept="image/*" @change="onCreateFile">
              <span class="pointer-events-none">{{ createFile ? 'Change photo' : 'Upload photo' }}</span>
            </label>
          </div>
        </a-form-item>
        <a-form-item label="Category" name="category_id" :rules="[{ required: true, message: 'Please select a category' }]">
          <a-select
            v-model:value="createForm.category_id"
            :options="modalCategoryOptions"
            placeholder="Select category"
            size="large"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="Privacy" name="privacy_status" :rules="[{ required: true, message: 'Please select privacy' }]">
          <a-select
            v-model:value="createForm.privacy_status"
            :options="[
              { value: '0', label: 'Public' },
              { value: '1', label: 'Private' }
            ]"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item label="Tags" name="tag_ids">
          <a-select
            v-model:value="createForm.tag_ids"
            mode="multiple"
            :options="modalTagOptions"
            placeholder="Select tags"
            allow-clear
            show-search
            option-filter-prop="label"
            size="large"
            style="width: 100%"
          />
        </a-form-item>
        <a-form-item class="!mb-0">
          <a-button type="primary" html-type="submit" size="large" :loading="createLoading">
            Create photo
          </a-button>
        </a-form-item>
      </a-form>
    </AdminModal>

    <AdminModal
      v-model="photoModalOpen"
      :title="photoModalTitle"
      size="wide"
      @close="closePhotoModal"
    >
      <PhotoEditPanel
        v-if="photoModalId"
        variant="modal"
        :photo-id="photoModalId"
        :allow-status-actions="false"
        :allow-delete="false"
        @deleted="onPhotoModalDeleted"
        @updated="onPhotoModalUpdated"
      />
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from '#app'
import { notification } from 'ant-design-vue'
import { adminConfirm } from '~/composables/adminConfirm'
import { photosAdminApi } from '~/features/admin/photos/services/photos.api.js'
import {
  categoriesAdminApi,
  categoriesListFromAdminBody
} from '~/features/admin/categories/services/categories.api.js'
import { tagsAdminApi, tagsListFromAdminBody } from '~/features/admin/tags/services/tags.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultPhotoAdminListFilters,
  buildPhotoAdminListCursorQuery
} from '~/composables/adminCursorListPresets'
import PhotoEditPanel from '~/features/admin/photos/components/PhotoEditPanel.vue'
import { privacyLabel, privacyBadgeClass, photoStatusBadgeClass } from '~/composables/photoAdminBadges'

const route = useRoute()
const router = useRouter()
const runtimeConfig = useRuntimeConfig()
const { showFromError } = useApiErrorMessage()

const categories = ref([])
const modalCategories = ref([])
const modalTags = ref([])

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
    const { data } = await photosAdminApi.photos(q)
    return data
  }
})

const categoryOptions = computed(() =>
  (categories.value || []).map((c) => ({
    value: String(c.id),
    label: c.category_name || c.name || 'Untitled category'
  }))
)

const modalCategoryOptions = computed(() =>
  modalCategories.value.map((c) => ({
    value: String(c.id),
    label: c.category_name || c.name || 'Untitled category'
  }))
)

const modalTagOptions = computed(() =>
  modalTags.value.map((t) => ({
    value: String(t.id),
    label: t.tag_name || 'Untitled tag'
  }))
)

const columns = [
  { title: 'Image', key: 'thumb', width: 90 },
  { title: 'Photo', dataIndex: 'title', key: 'title', ellipsis: true, width: 260 },
  { title: 'Location', dataIndex: 'location', key: 'location', ellipsis: true, width: 150 },
  { title: 'Uploaded', dataIndex: 'upload_date', key: 'upload_date', width: 170 },
  { title: 'User', key: 'user', width: 230 },
  { title: 'Privacy', dataIndex: 'privacy_status', key: 'privacy_status', width: 110 },
  { title: 'Status', dataIndex: 'photo_status', key: 'photo_status', width: 110 },
  { title: 'Views', dataIndex: 'total_views', key: 'total_views', width: 90 },
  { title: '', key: 'action', width: 100, fixed: 'right' }
]

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

const createOpen = ref(false)
const createLoading = ref(false)
const createImgRef = ref(null)
const createForm = ref({
  title: '',
  description: '',
  location: '',
  category_id: undefined,
  privacy_status: '0',
  tag_ids: []
})
const createFile = ref(null)
const createPreviewUrl = ref('')

const photoModalOpen = ref(false)
const photoModalId = ref(null)
const photoModalTitle = computed(() => (photoModalId.value ? 'Photo details' : ''))

function openPhotoModal(id) {
  photoModalId.value = id
  photoModalOpen.value = true
}

function closePhotoModal() {
  photoModalOpen.value = false
  photoModalId.value = null
}

function onPhotoModalDeleted() {
  closePhotoModal()
  fetchList(lastListPage.value)
}

function onPhotoModalUpdated() {
  fetchList(lastListPage.value)
}

async function confirmDeletePhoto(record) {
  const ok = await adminConfirm({
    title: 'Delete this photo?',
    content: 'This cannot be undone.',
    okText: 'Delete',
    cancelText: 'Cancel',
    danger: true
  })
  if (ok) {
    await deletePhotoById(record.id)
  }
}

async function deletePhotoById(id) {
  try {
    await photosAdminApi.deletePhoto(id)
    notification.success({
      message: 'Success',
      description: 'Photo deleted successfully!'
    })
    await fetchList(lastListPage.value)
  } catch (e) {
    showFromError(e)
  }
}

function resetCreate() {
  createForm.value = {
    title: '',
    description: '',
    location: '',
    category_id: undefined,
    privacy_status: '0',
    tag_ids: []
  }
  createFile.value = null
  if (createPreviewUrl.value) {
    URL.revokeObjectURL(createPreviewUrl.value)
    createPreviewUrl.value = ''
  }
  if (createImgRef.value) {
    createImgRef.value.value = ''
  }
}

function onCreateFile(e) {
  const f = e.target?.files?.[0] || null
  createFile.value = f
  if (createPreviewUrl.value) {
    URL.revokeObjectURL(createPreviewUrl.value)
    createPreviewUrl.value = ''
  }
  if (f) {
    createPreviewUrl.value = URL.createObjectURL(f)
  }
}

onUnmounted(() => {
  if (createPreviewUrl.value) {
    URL.revokeObjectURL(createPreviewUrl.value)
  }
})

async function loadModalCategories() {
  try {
    const { data } = await categoriesAdminApi.categories({ chunkSize: 100 })
    modalCategories.value = categoriesListFromAdminBody(data)
  } catch (e) {
    showFromError(e)
  }
}

async function loadModalTags() {
  try {
    const { data } = await tagsAdminApi.tags({ size: 500, page: 1 })
    modalTags.value = tagsListFromAdminBody(data)
  } catch (e) {
    showFromError(e)
  }
}

function tagsPayloadFromIds(ids) {
  const names = (ids || [])
    .map((id) => modalTags.value.find((t) => String(t.id) === String(id))?.tag_name)
    .filter(Boolean)
  return names.join(',')
}

watch(createOpen, (open) => {
  if (open) {
    loadModalCategories()
    loadModalTags()
  }
})

async function submitCreate() {
  if (!createFile.value) {
    notification.error({
      message: 'Error',
      description: 'Please choose an image.'
    })
    return
  }
  createLoading.value = true
  try {
    const fd = new FormData()
    fd.append('title', createForm.value.title)
    fd.append('description', createForm.value.description || '')
    fd.append('location', createForm.value.location || '')
    fd.append('image', createFile.value)
    fd.append('category_id', String(createForm.value.category_id))
    fd.append('privacy_status', String(createForm.value.privacy_status))
    fd.append('tags', tagsPayloadFromIds(createForm.value.tag_ids))
    await photosAdminApi.createPhoto(fd)
    notification.success({
      message: 'Success',
      description: 'Photo created successfully!'
    })
    createOpen.value = false
    resetCreate()
    await fetchList(1)
  } catch (e) {
    showFromError(e)
  } finally {
    createLoading.value = false
  }
}

async function loadFilterCategories() {
  try {
    const { data } = await categoriesAdminApi.categories({ chunkSize: 100 })
    categories.value = categoriesListFromAdminBody(data)
  } catch {
    categories.value = []
  }
}

function consumePhotoQuery() {
  const q = route.query.photo
  if (q != null && q !== '') {
    openPhotoModal(String(q))
    router.replace({ path: '/admin/photos', query: {} })
  }
}

watch(() => route.query.photo, consumePhotoQuery, { immediate: true })

onMounted(() => {
  fetchList(1)
  loadFilterCategories()
})
</script>
