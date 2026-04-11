<template>
  <div class="space-y-4">
    <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
      <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyFilters">
        <a-form-item label="Title">
          <a-input v-model:value="filters.title" allow-clear placeholder="Category name" style="width: 200px" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="button" @click="applyFilters">
            Apply
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="Categories">
    <div class="admin-toolbar">
      <a-button type="primary" size="large" class="!h-10 !rounded-lg !px-5 !font-semibold" @click="openCreate">
        <i class="fa-solid fa-plus mr-2 opacity-90" aria-hidden="true" />
        Add category
      </a-button>
    </div>
    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="rows"
        :pagination="false"
        :scroll="{ x: 720 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'thumb'">
            <div class="h-12 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
              <img
                v-if="categoryImageUrl(record)"
                :src="categoryImageUrl(record)"
                :alt="record.category_name || 'Category'"
                class="h-full w-full object-cover"
              >
              <div v-else class="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                No image
              </div>
            </div>
          </template>
          <template v-else-if="column.key === 'slug'">
            <span class="font-mono text-sm text-slate-700">{{ record.slug || '—' }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space size="small">
              <a-button type="text" class="admin-table-icon-btn" title="Edit" @click="openEdit(record)">
                <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
              </a-button>
              <a-button type="text" danger class="admin-table-icon-btn" title="Delete" @click="confirmDelete(record)">
                <i class="fa-solid fa-trash-can" aria-hidden="true" />
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <AdminPager
        v-bind="pagerMeta"
        item-label="danh mục"
        :loading="loading"
        @update:page="fetchList"
        @update:page-size="onPageSize"
      />
    </a-spin>

    <AdminModal
      v-model="createOpen"
      title="Add category"
      size="lg"
      @close="resetCreate"
    >
      <a-form layout="vertical" class="mt-1" :model="createForm" @finish="submitCreate">
        <a-form-item
          label="Name"
          name="category_name"
          :rules="[{ required: true, message: 'Please enter a category name' }]"
        >
          <a-input v-model:value="createForm.category_name" size="large" placeholder="Category name" />
        </a-form-item>
        <a-form-item label="Image (optional)">
          <div class="space-y-3">
            <div
              v-if="createPreviewUrl"
              class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <img
                :src="createPreviewUrl"
                alt="Selected image preview"
                class="max-h-52 w-full object-contain"
              >
            </div>
            <label class="admin-file-input">
              <input ref="createFileRef" class="sr-only" type="file" accept="image/*" @change="onCreateFile">
              <span class="pointer-events-none">{{ createFile ? 'Change image' : 'Click to upload image' }}</span>
            </label>
          </div>
        </a-form-item>
        <a-form-item class="!mb-0">
          <a-button type="primary" html-type="submit" size="large" :loading="createLoading">
            Create category
          </a-button>
        </a-form-item>
      </a-form>
    </AdminModal>

    <AdminModal
      v-model="editOpen"
      title="Edit category"
      size="lg"
      @close="resetEdit"
    >
      <a-form v-if="editingId" layout="vertical" class="mt-1" :model="editForm" @finish="submitEdit">
        <a-form-item
          label="Name"
          name="category_name"
          :rules="[{ required: true, message: 'Please enter a category name' }]"
        >
          <a-input v-model:value="editForm.category_name" size="large" />
        </a-form-item>
        <a-form-item label="Image (optional)">
          <div class="space-y-3">
            <div
              v-if="editDisplayImageUrl"
              class="overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
            >
              <img
                :src="editDisplayImageUrl"
                alt="Category image"
                class="max-h-52 w-full object-contain"
              >
            </div>
            <label class="admin-file-input">
              <input ref="editFileRef" class="sr-only" type="file" accept="image/*" @change="onEditFile">
              <span class="pointer-events-none">{{ editFile ? 'Change image' : 'Replace image' }}</span>
            </label>
          </div>
        </a-form-item>
        <a-form-item class="!mb-0">
          <a-button type="primary" html-type="submit" size="large" :loading="editLoading">
            Save changes
          </a-button>
        </a-form-item>
      </a-form>
    </AdminModal>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { notification } from 'ant-design-vue'
import { adminConfirm } from '~/composables/adminConfirm'
import { categoriesAdminApi } from '~/features/admin/categories/services/categories.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultCategoryAdminListFilters,
  buildCategoryAdminListCursorQuery
} from '~/composables/adminCursorListPresets'

const { showFromError } = useApiErrorMessage()
const runtimeConfig = useRuntimeConfig()

const mediaBase = computed(() =>
  String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, '')
)

const filters = ref(defaultCategoryAdminListFilters())

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
  itemsKey: 'categories',
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildCategoryAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const { data } = await categoriesAdminApi.categories(q)
    return data
  }
})

const columns = [
  { title: 'Image', key: 'thumb', width: 88 },
  { title: 'Name', dataIndex: 'category_name', key: 'category_name', ellipsis: true, minWidth: 200 },
  { title: 'Slug', dataIndex: 'slug', key: 'slug', ellipsis: true, width: 200 },
  { title: '', key: 'action', width: 100, fixed: 'right' }
]

function categoryImageUrl(record) {
  const path = record?.image || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
}

const createOpen = ref(false)
const createLoading = ref(false)
const createForm = ref({ category_name: '' })
const createFile = ref(null)
const createFileRef = ref(null)
const createPreviewUrl = ref('')

const editOpen = ref(false)
const editLoading = ref(false)
const editingId = ref(null)
const editingRecord = ref(null)
const editForm = ref({ category_name: '' })
const editFile = ref(null)
const editFileRef = ref(null)
const editPreviewUrl = ref('')

const editDisplayImageUrl = computed(() => {
  if (editPreviewUrl.value) {
    return editPreviewUrl.value
  }
  if (editingRecord.value) {
    return categoryImageUrl(editingRecord.value)
  }
  return ''
})

function openCreate() {
  resetCreate()
  createOpen.value = true
}

function resetCreate() {
  createForm.value = { category_name: '' }
  createFile.value = null
  if (createPreviewUrl.value) {
    URL.revokeObjectURL(createPreviewUrl.value)
    createPreviewUrl.value = ''
  }
  if (createFileRef.value) {
    createFileRef.value.value = ''
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

async function submitCreate() {
  createLoading.value = true
  try {
    const fd = new FormData()
    fd.append('category_name', String(createForm.value.category_name || '').trim())
    if (createFile.value) {
      fd.append('image', createFile.value)
    }
    await categoriesAdminApi.createCategory(fd)
    notification.success({
      message: 'Success',
      description: 'Category created successfully!'
    })
    createOpen.value = false
    await fetchList(1)
  } catch (e) {
    showFromError(e)
  } finally {
    createLoading.value = false
  }
}

function openEdit(record) {
  editingId.value = record.id
  editingRecord.value = record
  editForm.value = { category_name: record.category_name || record.name || '' }
  editFile.value = null
  if (editPreviewUrl.value) {
    URL.revokeObjectURL(editPreviewUrl.value)
    editPreviewUrl.value = ''
  }
  if (editFileRef.value) {
    editFileRef.value.value = ''
  }
  editOpen.value = true
}

function resetEdit() {
  editingId.value = null
  editingRecord.value = null
  editForm.value = { category_name: '' }
  editFile.value = null
  if (editPreviewUrl.value) {
    URL.revokeObjectURL(editPreviewUrl.value)
    editPreviewUrl.value = ''
  }
}

function onEditFile(e) {
  const f = e.target?.files?.[0] || null
  editFile.value = f
  if (editPreviewUrl.value) {
    URL.revokeObjectURL(editPreviewUrl.value)
    editPreviewUrl.value = ''
  }
  if (f) {
    editPreviewUrl.value = URL.createObjectURL(f)
  }
}

async function submitEdit() {
  if (!editingId.value) {
    return
  }
  const trimmed = String(editForm.value.category_name || '').trim()
  const original = String(editingRecord.value?.category_name || '').trim()
  if (trimmed === original && !editFile.value) {
    editOpen.value = false
    return
  }
  editLoading.value = true
  try {
    const fd = new FormData()
    fd.append('category_name', trimmed)
    if (editFile.value) {
      fd.append('image', editFile.value)
    }
    await categoriesAdminApi.updateCategory(editingId.value, fd)
    notification.success({
      message: 'Success',
      description: 'Category updated successfully!'
    })
    editOpen.value = false
    await fetchList(lastListPage.value)
  } catch (e) {
    showFromError(e)
  } finally {
    editLoading.value = false
  }
}

async function confirmDelete(record) {
  const ok = await adminConfirm({
    title: 'Delete this category?',
    content: 'This cannot be undone.',
    okText: 'Delete',
    cancelText: 'Cancel',
    danger: true
  })
  if (ok) {
    await doDelete(record.id)
  }
}

async function doDelete(id) {
  try {
    await categoriesAdminApi.deleteCategory(id)
    notification.success({
      message: 'Success',
      description: 'Category deleted successfully!'
    })
    await fetchList(lastListPage.value)
  } catch (e) {
    showFromError(e)
  }
}

onMounted(() => fetchList(1))

onUnmounted(() => {
  if (createPreviewUrl.value) {
    URL.revokeObjectURL(createPreviewUrl.value)
  }
  if (editPreviewUrl.value) {
    URL.revokeObjectURL(editPreviewUrl.value)
  }
})
</script>
