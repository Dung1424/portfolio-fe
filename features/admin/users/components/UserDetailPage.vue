<template>
  <a-spin :spinning="photosLoading || galleriesLoading">
    <a-card v-if="user" :title="user.username || user.email || 'User'">
      <a-tabs v-model:active-key="tab">
        <a-tab-pane key="photos" tab="Photos">
          <div class="space-y-4 pt-1">
            <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
              <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyPhotoFilters">
                <a-form-item label="Title">
                  <a-input v-model:value="photoFilters.title" allow-clear placeholder="Title" style="width: 160px" />
                </a-form-item>
                <a-form-item label="Location">
                  <a-input v-model:value="photoFilters.location" allow-clear placeholder="Location" style="width: 140px" />
                </a-form-item>
                <a-form-item label="Category">
                  <a-select
                    v-model:value="photoFilters.category_id"
                    allow-clear
                    placeholder="Any"
                    style="width: 160px"
                    :options="categoryOptions"
                  />
                </a-form-item>
                <a-form-item label="Privacy">
                  <a-select
                    v-model:value="photoFilters.privacy_status"
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
                  <a-date-picker v-model:value="photoFilters.start_date" value-format="YYYY-MM-DD" />
                </a-form-item>
                <a-form-item label="To">
                  <a-date-picker v-model:value="photoFilters.end_date" value-format="YYYY-MM-DD" />
                </a-form-item>
                <a-form-item>
                  <a-button type="primary" html-type="button" @click="applyPhotoFilters">
                    Apply
                  </a-button>
                </a-form-item>
              </a-form>
            </a-card>

            <a-table
              :columns="photoCols"
              :data-source="photoRows"
              :pagination="false"
              :scroll="{ x: 1100 }"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'thumb'">
                  <div class="h-10 w-14 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                    <img
                      v-if="photoImageUrl(record)"
                      :src="photoImageUrl(record)"
                      :alt="record.title || 'Photo'"
                      class="h-full w-full object-cover"
                    >
                    <div v-else class="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                      —
                    </div>
                  </div>
                </template>
                <template v-else-if="column.key === 'title'">
                  <div class="max-w-[200px]">
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
                <template v-else-if="column.key === 'category'">
                  <span class="text-slate-700">{{ record.category?.category_name || record.category?.name || '—' }}</span>
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
                <template v-else-if="column.key === 'open'">
                  <a-button
                    v-if="record?.id"
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
              v-bind="photoPagerMeta"
              item-label="ảnh"
              :loading="photosLoading"
              @update:page="fetchPhotoList"
              @update:page-size="onPhotoPageSize"
            />
          </div>
        </a-tab-pane>

        <a-tab-pane key="galleries" tab="Galleries">
          <div class="space-y-4 pt-1">
            <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
              <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyGalleryFilters">
                <a-form-item label="Title">
                  <a-input v-model:value="galleryFilters.title" allow-clear placeholder="Gallery name" style="width: 200px" />
                </a-form-item>
                <a-form-item>
                  <a-button type="primary" html-type="button" @click="applyGalleryFilters">
                    Apply
                  </a-button>
                </a-form-item>
              </a-form>
            </a-card>

            <a-table
              :columns="galCols"
              :data-source="galleryRows"
              :pagination="false"
              :scroll="{ x: 600 }"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'visibility'">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                    :class="galleryVisibilityClass(record.visibility)"
                  >
                    {{ galleryVisibilityLabel(record.visibility) }}
                  </span>
                </template>
                <template v-else-if="column.key === 'open'">
                  <NuxtLink
                    v-if="record?.id"
                    :to="`/admin/galleries/${record.id}`"
                    class="admin-table-link-icon"
                    title="Open gallery"
                  >
                    <i class="fa-solid fa-up-right-from-square" aria-hidden="true" />
                  </NuxtLink>
                </template>
              </template>
            </a-table>
            <AdminPager
              v-bind="galleryPagerMeta"
              item-label="gallery"
              :loading="galleriesLoading"
              @update:page="fetchGalleryList"
              @update:page-size="onGalleryPageSize"
            />
          </div>
        </a-tab-pane>
      </a-tabs>
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
  </a-spin>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from '#app'
import { usersAdminApi } from '~/features/admin/users/services/users.api.js'
import {
  categoriesAdminApi,
  categoriesListFromAdminBody
} from '~/features/admin/categories/services/categories.api.js'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultPhotoAdminListFilters,
  buildPhotoAdminListCursorQuery,
  defaultUserGalleriesAdminListFilters,
  buildUserGalleriesAdminListCursorQuery
} from '~/composables/adminCursorListPresets'
import { privacyLabel, privacyBadgeClass, photoStatusBadgeClass } from '~/composables/photoAdminBadges'
import PhotoViewPanel from '~/features/admin/photos/components/PhotoViewPanel.vue'

const route = useRoute()
const runtimeConfig = useRuntimeConfig()
const id = computed(() => route.params.id)
const user = ref(null)
const tab = ref('photos')
const categories = ref([])

const photoFilters = ref(defaultPhotoAdminListFilters())
const {
  loading: photosLoading,
  rows: photoRows,
  pagerMeta: photoPagerMeta,
  fetchList: fetchPhotoList,
  applyFilters: applyPhotoFilters,
  onPageSize: onPhotoPageSize,
  resetPagination: resetPhotoPagination
} = useAdminCursorList({
  filters: photoFilters,
  itemsKey: 'photos',
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildPhotoAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const { data } = await usersAdminApi.userPhotos(id.value, q)
    if (data?.user) {
      user.value = data.user
    }
    return data
  }
})

const galleryFilters = ref(defaultUserGalleriesAdminListFilters())
const {
  loading: galleriesLoading,
  rows: galleryRows,
  pagerMeta: galleryPagerMeta,
  fetchList: fetchGalleryList,
  applyFilters: applyGalleryFilters,
  onPageSize: onGalleryPageSize,
  resetPagination: resetGalleryPagination
} = useAdminCursorList({
  filters: galleryFilters,
  itemsKey: 'galleries',
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildUserGalleriesAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const { data } = await usersAdminApi.userGalleries(id.value, q)
    if (data?.user) {
      user.value = data.user
    }
    return data
  }
})

const mediaBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, ''))

const categoryOptions = computed(() =>
  (categories.value || []).map((c) => ({
    value: String(c.id),
    label: c.category_name || c.name || 'Untitled category'
  }))
)

const photoCols = [
  { title: 'Image', key: 'thumb', width: 76 },
  { title: 'Photo', key: 'title', ellipsis: true, width: 220 },
  { title: 'Location', key: 'location', ellipsis: true, width: 120 },
  { title: 'Category', key: 'category', width: 120 },
  { title: 'Privacy', key: 'privacy_status', width: 100 },
  { title: 'Status', key: 'photo_status', width: 100 },
  { title: 'Views', dataIndex: 'total_views', key: 'total_views', width: 72 },
  { title: '', key: 'open', width: 56, fixed: 'right' }
]

const galCols = [
  { title: 'Name', dataIndex: 'galleries_name', key: 'galleries_name', ellipsis: true, width: 220 },
  { title: 'Description', dataIndex: 'galleries_description', key: 'galleries_description', ellipsis: true },
  { title: 'Visibility', key: 'visibility', width: 100 },
  { title: '', key: 'open', width: 72, fixed: 'right' }
]

const detailModalOpen = ref(false)
const detailPhotoId = ref(null)
const detailModalTitle = computed(() => (detailPhotoId.value ? 'Chi tiết ảnh' : ''))

function openDetailModal(photoId) {
  detailPhotoId.value = photoId
  detailModalOpen.value = true
}

function closeDetailModal() {
  detailModalOpen.value = false
  detailPhotoId.value = null
}

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

function galleryVisibilityLabel(v) {
  return String(v) === '1' ? 'Private' : 'Public'
}

function galleryVisibilityClass(v) {
  return String(v) === '1'
    ? 'bg-amber-50 text-amber-800 ring-amber-200/80'
    : 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
}

async function loadFilterCategories() {
  try {
    const { data } = await categoriesAdminApi.categories({ chunkSize: 100 })
    categories.value = categoriesListFromAdminBody(data)
  } catch {
    categories.value = []
  }
}

watch(
  id,
  async () => {
    user.value = null
    resetPhotoPagination()
    resetGalleryPagination()
    await Promise.all([fetchPhotoList(1), fetchGalleryList(1)])
  },
  { immediate: true }
)

onMounted(() => {
  loadFilterCategories()
})
</script>
