<template>
  <div class="space-y-4">
    <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
      <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyFilters">
        <a-form-item label="Title">
          <a-input v-model:value="filters.title" allow-clear placeholder="Title" style="width: 160px" />
        </a-form-item>
        <a-form-item label="Slug">
          <a-input v-model:value="filters.slug" allow-clear placeholder="Slug" style="width: 180px" />
        </a-form-item>
        <a-form-item label="Author ID">
          <a-input v-model:value="filters.author_id" allow-clear placeholder="UUID" style="width: 220px" />
        </a-form-item>
        <a-form-item label="Content">
          <a-input v-model:value="filters.content" allow-clear placeholder="Search in content" style="width: 180px" />
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

    <a-card title="Blogs">
      <div class="admin-toolbar">
        <a-button type="primary" size="large" class="!h-10 !rounded-lg !px-5 !font-semibold" @click="openCreate">
          <i class="fa-solid fa-plus mr-2 opacity-90" aria-hidden="true" />
          New blog
        </a-button>
      </div>
      <a-spin :spinning="loading">
        <a-table
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          :scroll="{ x: 880 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'image'">
              <div class="h-12 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <img
                  v-if="blogImageUrl(record)"
                  :src="blogImageUrl(record)"
                  :alt="record.title || 'Blog'"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                  —
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'author'">
              <span class="text-slate-700">{{ authorLabel(record) }}</span>
            </template>
            <template v-else-if="column.key === 'created_at'">
              <span class="text-slate-600">{{ formatDateOnly(record.created_at) }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
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
          item-label="blog"
          :loading="loading"
          @update:page="fetchList"
          @update:page-size="onPageSize"
        />
      </a-spin>
    </a-card>

    <AdminModal
      v-model="createOpen"
      title="New blog"
      size="xl"
      body-class="!py-4"
      @close="resetCreate"
    >
      <div class="mt-1 max-h-[min(78vh,820px)] space-y-6 overflow-y-auto pr-1">
        <div class="space-y-4">
          <div>
            <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Title</label>
            <a-input v-model:value="createForm.title" size="large" placeholder="Blog title" allow-clear />
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Content</label>
            <div class="rounded-xl border border-slate-200/90 bg-slate-50/50 p-1 shadow-inner">
              <a-textarea
                v-model:value="createForm.content"
                :rows="10"
                placeholder="Full article body…"
                class="!min-h-[200px] !border-0 !bg-transparent !shadow-none"
              />
            </div>
          </div>
        </div>

        <div class="grid gap-5 sm:grid-cols-2">
          <div class="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cover image
            </p>
            <div class="space-y-3">
              <div
                v-if="createCoverPreviewUrl"
                class="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <img
                  :src="createCoverPreviewUrl"
                  alt="Cover preview"
                  class="max-h-44 w-full object-contain"
                >
              </div>
              <label class="admin-file-input">
                <input ref="createCoverRef" class="sr-only" type="file" accept="image/*" @change="onCreateCover">
                <span class="pointer-events-none">{{ createCover ? 'Change cover' : 'Upload cover' }}</span>
              </label>
              <p class="text-xs leading-relaxed text-slate-500">
                Required. Shown as the blog header.
              </p>
            </div>
          </div>
          <div class="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm">
            <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Extra image
            </p>
            <div class="space-y-3">
              <div
                v-if="createExtraPreviewUrl"
                class="overflow-hidden rounded-xl border border-slate-200 bg-white"
              >
                <img
                  :src="createExtraPreviewUrl"
                  alt="Extra preview"
                  class="max-h-44 w-full object-contain"
                >
              </div>
              <label class="admin-file-input">
                <input ref="createExtraRef" class="sr-only" type="file" accept="image/*" @change="onCreateExtra">
                <span class="pointer-events-none">{{ createExtra ? 'Change image' : 'Upload (optional)' }}</span>
              </label>
              <p class="text-xs leading-relaxed text-slate-500">
                Optional second image for the post.
              </p>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
          <a-button size="large" @click="closeCreateModal">
            Cancel
          </a-button>
          <a-button type="primary" size="large" :loading="createLoading" @click="submitCreate">
            Create blog
          </a-button>
        </div>
      </div>
    </AdminModal>

    <AdminModal
      v-model="editOpen"
      title="Edit blog"
      size="xl"
      body-class="!py-4"
      @close="resetEdit"
    >
      <a-spin :spinning="editFetching">
        <div v-if="editingId" class="mt-1 max-h-[min(78vh,820px)] space-y-6 overflow-y-auto pr-1">
          <div class="space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Title</label>
              <a-input v-model:value="editForm.title" size="large" placeholder="Blog title" allow-clear />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Content</label>
              <div class="rounded-xl border border-slate-200/90 bg-slate-50/50 p-1 shadow-inner">
                <a-textarea
                  v-model:value="editForm.content"
                  :rows="10"
                  placeholder="Full article body…"
                  class="!min-h-[200px] !border-0 !bg-transparent !shadow-none"
                />
              </div>
            </div>
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <div class="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm">
              <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cover image
              </p>
              <div class="space-y-3">
                <div
                  v-if="editCoverDisplaySrc"
                  class="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <img
                    :src="editCoverDisplaySrc"
                    alt="Cover"
                    class="max-h-44 w-full object-contain"
                  >
                </div>
                <p v-if="editCoverImagePath" class="break-all text-[11px] leading-snug text-slate-500">
                  {{ editCoverImagePath }}
                </p>
                <label class="admin-file-input">
                  <input ref="editCoverRef" class="sr-only" type="file" accept="image/*" @change="onEditCover">
                  <span class="pointer-events-none">{{ editCover ? 'Change cover' : 'Replace cover' }}</span>
                </label>
                <p class="text-xs leading-relaxed text-slate-500">
                  Leave unchanged to keep the current cover.
                </p>
              </div>
            </div>
            <div class="rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm">
              <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Extra image
              </p>
              <div class="space-y-3">
                <div
                  v-if="editExtraDisplaySrc"
                  class="overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <img
                    :src="editExtraDisplaySrc"
                    alt="Extra"
                    class="max-h-44 w-full object-contain"
                  >
                </div>
                <p v-if="editImagePath" class="break-all text-[11px] leading-snug text-slate-500">
                  {{ editImagePath }}
                </p>
                <label class="admin-file-input">
                  <input ref="editExtraRef" class="sr-only" type="file" accept="image/*" @change="onEditExtra">
                  <span class="pointer-events-none">{{ editExtra ? 'Change image' : 'Replace image' }}</span>
                </label>
                <p class="text-xs leading-relaxed text-slate-500">
                  Leave unchanged to keep the current image.
                </p>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
            <a-button size="large" @click="closeEditModal">
              Cancel
            </a-button>
            <a-button type="primary" size="large" :loading="editLoading" @click="submitEdit">
              Save changes
            </a-button>
          </div>
        </div>
      </a-spin>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { notification } from 'ant-design-vue'
import { adminConfirm } from '~/composables/adminConfirm'
import { blogsAdminApi } from '~/features/admin/blogs/services/blogs.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultBlogAdminListFilters,
  buildBlogAdminListCursorQuery
} from '~/composables/adminCursorListPresets'

const { showFromError } = useApiErrorMessage()
const runtimeConfig = useRuntimeConfig()
const mediaBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, ''))

const filters = ref(defaultBlogAdminListFilters())

const {
  loading,
  rows,
  pagerMeta,
  fetchList,
  applyFilters,
  onPageSize
} = useAdminCursorList({
  filters,
  itemsKey: 'blogs',
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildBlogAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const { data } = await blogsAdminApi.blogs(q)
    return data
  }
})

const columns = [
  { title: 'Image', key: 'image', width: 88 },
  { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true, width: 260 },
  { title: 'Author', key: 'author', width: 140 },
  { title: 'Created', key: 'created_at', width: 120 },
  { title: '', key: 'action', width: 100, fixed: 'right' }
]

function authorLabel(record) {
  const a = record?.author
  if (!a || typeof a !== 'object') {
    return '—'
  }
  return a.username || a.name || a.email || '—'
}

function formatDateOnly(v) {
  if (v == null || v === '') {
    return '—'
  }
  const s = String(v)
  const t = s.indexOf('T')
  if (t === 10) {
    return s.slice(0, 10)
  }
  const sp = s.indexOf(' ')
  if (sp > 0 && sp <= 10) {
    return s.slice(0, sp)
  }
  return s.length >= 10 ? s.slice(0, 10) : s
}

function mediaUrlFromPath(path) {
  if (path == null || path === '') {
    return ''
  }
  const p = String(path)
  if (/^https?:\/\//i.test(p)) {
    return p
  }
  return `${mediaBase.value}${p.startsWith('/') ? '' : '/'}${p}`
}

function blogImageUrl(record) {
  return mediaUrlFromPath(record?.image || record?.cover_image || '')
}

function revokePreview(url) {
  if (url && String(url).startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

const createOpen = ref(false)
const createLoading = ref(false)
const createForm = ref({ title: '', content: '' })
const createCover = ref(null)
const createExtra = ref(null)
const createCoverRef = ref(null)
const createExtraRef = ref(null)
const createCoverPreviewUrl = ref('')
const createExtraPreviewUrl = ref('')

const editOpen = ref(false)
const editLoading = ref(false)
const editFetching = ref(false)
const editingId = ref(null)
const editForm = ref({ title: '', content: '' })
const editCover = ref(null)
const editExtra = ref(null)
const editCoverRef = ref(null)
const editExtraRef = ref(null)
/** Paths từ API Blog/Detail (preview khi chưa chọn file mới). */
const editCoverImagePath = ref('')
const editImagePath = ref('')
const editCoverPreviewUrl = ref('')
const editExtraPreviewUrl = ref('')

const editCoverDisplaySrc = computed(
  () => editCoverPreviewUrl.value || mediaUrlFromPath(editCoverImagePath.value) || ''
)
const editExtraDisplaySrc = computed(
  () => editExtraPreviewUrl.value || mediaUrlFromPath(editImagePath.value) || ''
)

function openCreate() {
  resetCreate()
  createOpen.value = true
}

function closeCreateModal() {
  createOpen.value = false
  resetCreate()
}

function closeEditModal() {
  editOpen.value = false
  resetEdit()
}

function resetCreate() {
  createForm.value = { title: '', content: '' }
  createCover.value = null
  createExtra.value = null
  revokePreview(createCoverPreviewUrl.value)
  createCoverPreviewUrl.value = ''
  revokePreview(createExtraPreviewUrl.value)
  createExtraPreviewUrl.value = ''
  if (createCoverRef.value) {
    createCoverRef.value.value = ''
  }
  if (createExtraRef.value) {
    createExtraRef.value.value = ''
  }
}

function onCreateCover(e) {
  const f = e.target?.files?.[0] || null
  createCover.value = f
  revokePreview(createCoverPreviewUrl.value)
  createCoverPreviewUrl.value = ''
  if (f) {
    createCoverPreviewUrl.value = URL.createObjectURL(f)
  }
}
function onCreateExtra(e) {
  const f = e.target?.files?.[0] || null
  createExtra.value = f
  revokePreview(createExtraPreviewUrl.value)
  createExtraPreviewUrl.value = ''
  if (f) {
    createExtraPreviewUrl.value = URL.createObjectURL(f)
  }
}

async function submitCreate() {
  if (!String(createForm.value.title || '').trim() || !String(createForm.value.content || '').trim()) {
    notification.error({
      message: 'Error',
      description: 'Please enter title and content.'
    })
    return
  }
  if (!createCover.value) {
    notification.error({
      message: 'Error',
      description: 'Please upload a cover image.'
    })
    return
  }
  createLoading.value = true
  try {
    const fd = new FormData()
    fd.append('title', createForm.value.title)
    fd.append('content', createForm.value.content)
    fd.append('cover_image', createCover.value)
    if (createExtra.value) {
      fd.append('image', createExtra.value)
    }
    await blogsAdminApi.createBlog(fd)
    notification.success({
      message: 'Success',
      description: 'Blog created successfully!'
    })
    createOpen.value = false
    resetCreate()
    await fetchList(pagerMeta.value.page)
  } catch (e) {
    showFromError(e)
  } finally {
    createLoading.value = false
  }
}

async function openEdit(record) {
  revokePreview(editCoverPreviewUrl.value)
  editCoverPreviewUrl.value = ''
  revokePreview(editExtraPreviewUrl.value)
  editExtraPreviewUrl.value = ''
  editFetching.value = true
  editOpen.value = true
  try {
    const { data } = await blogsAdminApi.blog(record.id)
    const blog = data.blog ?? data
    editingId.value = blog.id
    editForm.value = {
      title: blog.title ?? '',
      content: blog.content ?? ''
    }
    editCoverImagePath.value = blog.cover_image ?? ''
    editImagePath.value = blog.image ?? ''
    editCover.value = null
    editExtra.value = null
    if (editCoverRef.value) {
      editCoverRef.value.value = ''
    }
    if (editExtraRef.value) {
      editExtraRef.value.value = ''
    }
  } catch (e) {
    showFromError(e)
    editOpen.value = false
    editingId.value = null
    editCoverImagePath.value = ''
    editImagePath.value = ''
    revokePreview(editCoverPreviewUrl.value)
    editCoverPreviewUrl.value = ''
    revokePreview(editExtraPreviewUrl.value)
    editExtraPreviewUrl.value = ''
  } finally {
    editFetching.value = false
  }
}

function resetEdit() {
  editingId.value = null
  editForm.value = { title: '', content: '' }
  editCoverImagePath.value = ''
  editImagePath.value = ''
  editCover.value = null
  editExtra.value = null
  revokePreview(editCoverPreviewUrl.value)
  editCoverPreviewUrl.value = ''
  revokePreview(editExtraPreviewUrl.value)
  editExtraPreviewUrl.value = ''
  if (editCoverRef.value) {
    editCoverRef.value.value = ''
  }
  if (editExtraRef.value) {
    editExtraRef.value.value = ''
  }
}

function onEditCover(e) {
  const f = e.target?.files?.[0] || null
  editCover.value = f
  revokePreview(editCoverPreviewUrl.value)
  editCoverPreviewUrl.value = ''
  if (f) {
    editCoverPreviewUrl.value = URL.createObjectURL(f)
  }
}
function onEditExtra(e) {
  const f = e.target?.files?.[0] || null
  editExtra.value = f
  revokePreview(editExtraPreviewUrl.value)
  editExtraPreviewUrl.value = ''
  if (f) {
    editExtraPreviewUrl.value = URL.createObjectURL(f)
  }
}

async function submitEdit() {
  if (!editingId.value) {
    return
  }
  if (!String(editForm.value.title || '').trim() || !String(editForm.value.content || '').trim()) {
    notification.error({
      message: 'Error',
      description: 'Please enter title and content.'
    })
    return
  }
  editLoading.value = true
  try {
    const fd = new FormData()
    fd.append('title', editForm.value.title)
    fd.append('content', editForm.value.content)
    if (editCover.value) {
      fd.append('cover_image', editCover.value)
    }
    if (editExtra.value) {
      fd.append('image', editExtra.value)
    }
    await blogsAdminApi.updateBlog(editingId.value, fd)
    notification.success({
      message: 'Success',
      description: 'Blog saved successfully!'
    })
    editOpen.value = false
    resetEdit()
    await fetchList(pagerMeta.value.page)
  } catch (e) {
    showFromError(e)
  } finally {
    editLoading.value = false
  }
}

async function confirmDelete(record) {
  const ok = await adminConfirm({
    title: 'Delete this blog?',
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
    await blogsAdminApi.deleteBlog(id)
    notification.success({
      message: 'Success',
      description: 'Blog deleted successfully!'
    })
    await fetchList(pagerMeta.value.page)
  } catch (e) {
    showFromError(e)
  }
}

onUnmounted(() => {
  revokePreview(createCoverPreviewUrl.value)
  revokePreview(createExtraPreviewUrl.value)
  revokePreview(editCoverPreviewUrl.value)
  revokePreview(editExtraPreviewUrl.value)
})

onMounted(() => fetchList(1))
</script>
