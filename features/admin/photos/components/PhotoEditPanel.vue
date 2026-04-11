<template>
  <div
    class="photo-edit-panel"
    :class="{ 'max-h-[min(84vh,900px)] overflow-y-auto pr-0.5': variant === 'modal' }"
  >
    <a-spin :spinning="loading">
      <a-card
        v-if="photo"
        :title="variant === 'page' ? (photo.title || 'Photo') : undefined"
        :bordered="variant === 'page' || variant === 'modal'"
        :class="cardClass"
      >
        <div
          v-if="allowStatusActions || allowDelete"
          class="photo-edit-toolbar mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/70 bg-gradient-to-b from-white to-slate-50/90 p-3 shadow-[0_1px_2px_rgb(15_23_42/0.04)]"
        >
          <template v-if="allowStatusActions">
            <a-button type="primary" @click="patchStatus('approved')">
              Approve
            </a-button>
            <a-button danger @click="patchStatus('rejected')">
              Reject
            </a-button>
            <a-button @click="patchStatus('pending')">
              Pending
            </a-button>
          </template>
          <a-button
            v-if="allowDelete"
            danger
            type="default"
            class="!border-red-200 !text-red-600 hover:!border-red-300 hover:!bg-red-50"
            @click="confirmDeletePhoto"
          >
            Delete
          </a-button>
        </div>

        <div class="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
          <aside class="space-y-4">
            <div
              v-if="displayImageUrl"
              class="overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-2 shadow-[0_1px_2px_rgb(15_23_42/0.06),0_10px_24px_-14px_rgb(15_23_42/0.25)]"
            >
              <img :src="displayImageUrl" :alt="photo.title || 'Photo'" class="max-h-80 w-full rounded-xl object-cover">
            </div>
            <div v-else class="flex h-44 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
              No preview image
            </div>

            <dl class="photo-edit-meta grid grid-cols-2 gap-2.5 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
              <div class="rounded-lg bg-white px-3 py-2.5 shadow-sm">
                <dt>Privacy</dt>
                <dd class="mt-1">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                    :class="privacyBadgeClass(photo.privacy_status)"
                  >
                    {{ privacyLabel(photo.privacy_status) }}
                  </span>
                </dd>
              </div>
              <div class="rounded-lg bg-white px-3 py-2.5 shadow-sm">
                <dt>Status</dt>
                <dd class="mt-1 capitalize">
                  <span
                    class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset"
                    :class="photoStatusBadgeClass(photo.photo_status)"
                  >
                    {{ photo.photo_status || '—' }}
                  </span>
                </dd>
              </div>
              <div class="col-span-2 rounded-lg bg-white px-3 py-2.5 shadow-sm">
                <dt>Location</dt>
                <dd>{{ photo.location || '—' }}</dd>
              </div>
            </dl>
          </aside>

          <section class="space-y-4">
            <div class="rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50/70 to-white p-4">
              <h3 class="font-[family-name:var(--font-portfolio-heading)] text-base font-semibold text-portfolio-ink">
                Edit Photo
              </h3>
              <p class="mt-1 text-sm text-slate-500">
                Update photo details and save changes.
              </p>
            </div>

            <a-form
              class="rounded-2xl border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgb(15_23_42/0.04)] sm:p-5"
              layout="vertical"
              @finish="savePhoto"
            >
              <a-form-item label="Title" :rules="[{ required: true }]">
                <a-input v-model:value="edit.title" size="large" />
              </a-form-item>
              <a-form-item label="Description">
                <a-textarea v-model:value="edit.description" :rows="4" />
              </a-form-item>
              <div class="grid gap-3 sm:grid-cols-2">
                <a-form-item label="Location">
                  <a-input v-model:value="edit.location" />
                </a-form-item>
                <a-form-item label="Privacy">
                  <a-select
                    v-model:value="edit.privacy_status"
                    :options="[
                      { value: '0', label: 'Public' },
                      { value: '1', label: 'Private' }
                    ]"
                    style="width: 100%"
                  />
                </a-form-item>
              </div>
              <a-form-item label="Category">
                <a-select
                  v-model:value="edit.category_id"
                  :options="categoryOptions"
                  size="large"
                  style="width: 100%"
                />
              </a-form-item>
              <a-form-item label="Tags">
                <a-select
                  v-model:value="edit.tag_ids"
                  mode="multiple"
                  :options="tagOptions"
                  placeholder="Select tags"
                  allow-clear
                  show-search
                  option-filter-prop="label"
                  size="large"
                  style="width: 100%"
                />
              </a-form-item>
              <a-form-item label="Replace image (optional)">
                <div class="space-y-3">
                  <div
                    v-if="displayImageUrl"
                    class="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/90 p-3"
                  >
                    <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">Current</span>
                    <img
                      :src="displayImageUrl"
                      :alt="photo.title || 'Current photo'"
                      class="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                    >
                    <span class="min-w-0 truncate text-xs text-slate-500">Current file on server</span>
                  </div>
                  <label class="admin-file-input">
                    <input
                      ref="replaceInputRef"
                      type="file"
                      accept="image/*"
                      class="sr-only"
                      @change="onReplaceFile"
                    >
                    <span class="pointer-events-none">Choose new image</span>
                  </label>
                  <div
                    v-if="replacePreviewUrl"
                    class="flex items-center gap-3 rounded-xl border border-admin-accent/25 bg-admin-accent/5 p-3"
                  >
                    <span class="shrink-0 text-xs font-semibold uppercase tracking-wide text-admin-accent">New</span>
                    <img
                      :src="replacePreviewUrl"
                      alt="Preview"
                      class="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover"
                    >
                    <span class="min-w-0 truncate text-xs text-slate-600">{{ replaceFile?.name }}</span>
                  </div>
                  <p v-else-if="replaceFile" class="text-xs text-slate-500">
                    Selected: {{ replaceFile.name }}
                  </p>
                </div>
              </a-form-item>
              <a-form-item class="!mb-0">
                <a-button
                  type="primary"
                  html-type="button"
                  size="large"
                  class="!px-6 !font-semibold"
                  :loading="saving"
                  @click="savePhoto"
                >
                  Save changes
                </a-button>
              </a-form-item>
            </a-form>
          </section>
        </div>
      </a-card>
    </a-spin>
  </div>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import { navigateTo } from '#app'
import { notification } from 'ant-design-vue'
import { adminConfirm } from '~/composables/adminConfirm'
import { photosAdminApi } from '~/features/admin/photos/services/photos.api.js'
import { categoriesAdminApi, categoriesListFromAdminBody } from '~/features/admin/categories/services/categories.api.js'
import { tagsAdminApi, tagsListFromAdminBody } from '~/features/admin/tags/services/tags.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { privacyLabel, privacyBadgeClass, photoStatusBadgeClass } from '~/composables/photoAdminBadges'

const props = defineProps({
  photoId: { type: [String, Number], required: true },
  variant: { type: String, default: 'page' },
  allowStatusActions: { type: Boolean, default: true },
  allowDelete: { type: Boolean, default: true }
})

const emit = defineEmits(['deleted', 'updated'])

const { showFromError } = useApiErrorMessage()
const runtimeConfig = useRuntimeConfig()

const id = computed(() => props.photoId)
const allowStatusActions = computed(() => props.allowStatusActions)
const allowDelete = computed(() => props.allowDelete)

const cardClass = computed(() => {
  if (props.variant === 'modal') {
    return '!rounded-2xl !border-slate-200/90 !shadow-sm [&_.ant-card-body]:!pt-2'
  }
  return ''
})

const loading = ref(true)
const saving = ref(false)
const photo = ref(null)
const categories = ref([])
const tags = ref([])
const replaceFile = ref(null)
const replaceInputRef = ref(null)
const replacePreviewUrl = ref('')

const edit = ref({
  title: '',
  description: '',
  location: '',
  category_id: undefined,
  privacy_status: '0',
  tag_ids: []
})

const mediaBase = computed(() =>
  String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, '')
)

const displayImageUrl = computed(() => {
  const p = photo.value
  if (!p) {
    return ''
  }
  const path = p.image_url || p.url || p.photo_url || p.path || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
})

const categoryOptions = computed(() =>
  categories.value.map((c) => ({
    value: String(c.id),
    label: c.category_name || c.name || 'Untitled category'
  }))
)

const tagOptions = computed(() =>
  tags.value.map((t) => ({
    value: String(t.id),
    label: t.tag_name || 'Untitled tag'
  }))
)

function tagIdsFromPhoto(p) {
  const raw = p?.tags
  if (!Array.isArray(raw) || !raw.length) {
    return []
  }
  return raw
    .map((item) => {
      if (item && typeof item === 'object' && item.id != null) {
        return String(item.id)
      }
      const name = typeof item === 'string' ? item : item?.tag_name
      if (!name) {
        return null
      }
      const found = tags.value.find(
        (t) => String(t.tag_name).trim().toLowerCase() === String(name).trim().toLowerCase()
      )
      return found ? String(found.id) : null
    })
    .filter(Boolean)
}

function syncEditFromPhoto() {
  const p = photo.value
  if (!p) {
    return
  }
  edit.value = {
    title: p.title ?? '',
    description: p.description ?? '',
    location: p.location ?? '',
    category_id: p.category_id != null ? String(p.category_id) : undefined,
    privacy_status: String(p.privacy_status ?? '0'),
    tag_ids: tagIdsFromPhoto(p)
  }
}

async function load() {
  loading.value = true
  try {
    const [{ data: d1 }, { data: d2 }, { data: d3 }] = await Promise.all([
      photosAdminApi.photo(id.value),
      categoriesAdminApi.categories({ chunkSize: 100 }),
      tagsAdminApi.tags({ size: 500, page: 1 })
    ])
    photo.value = d1.photo ?? d1
    categories.value = categoriesListFromAdminBody(d2)
    tags.value = tagsListFromAdminBody(d3)
    syncEditFromPhoto()
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}

function onReplaceFile(e) {
  const f = e.target?.files?.[0] || null
  replaceFile.value = f
  if (replacePreviewUrl.value) {
    URL.revokeObjectURL(replacePreviewUrl.value)
    replacePreviewUrl.value = ''
  }
  if (f) {
    replacePreviewUrl.value = URL.createObjectURL(f)
  }
}

function clearReplaceSelection() {
  replaceFile.value = null
  if (replacePreviewUrl.value) {
    URL.revokeObjectURL(replacePreviewUrl.value)
    replacePreviewUrl.value = ''
  }
  if (replaceInputRef.value) {
    replaceInputRef.value.value = ''
  }
}

async function savePhoto() {
  const title = String(edit.value.title || '').trim()
   if (!title) {
    notification.error({
      message: 'Error',
      description: 'Please enter a title.'
    })
    return
  }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('title', title)
    fd.append('description', edit.value.description || '')
    fd.append('location', edit.value.location || '')
    if (replaceFile.value) {
      fd.append('image', replaceFile.value)
    }
    const cat = edit.value.category_id
    if (cat != null && cat !== '') {
      fd.append('category_id', String(cat))
    }
    fd.append('privacy_status', String(edit.value.privacy_status ?? '0'))
    const tagNames = (edit.value.tag_ids || [])
      .map((tid) => tags.value.find((t) => String(t.id) === String(tid))?.tag_name)
      .filter(Boolean)
    fd.append('tags', tagNames.join(','))
    await photosAdminApi.updatePhoto(id.value, fd)
    notification.success({
      message: 'Success',
      description: 'Photo updated successfully!'
    })
    clearReplaceSelection()
    await load()
    emit('updated')
  } catch (e) {
    showFromError(e)
  } finally {
    saving.value = false
  }
}

onUnmounted(() => {
  if (replacePreviewUrl.value) {
    URL.revokeObjectURL(replacePreviewUrl.value)
  }
})

async function patchStatus(status) {
  try {
    await photosAdminApi.patchPhotoStatus(id.value, status)
    notification.success({
      message: 'Success',
      description: `Photo status updated to ${status}.`
    })
    await load()
    emit('updated')
  } catch (e) {
    showFromError(e)
  }
}

async function confirmDeletePhoto() {
  const ok = await adminConfirm({
    title: 'Delete this photo?',
    content: 'This action cannot be undone.',
    okText: 'Delete',
    cancelText: 'Cancel',
    danger: true
  })
  if (ok) {
    await removePhoto()
  }
}

async function removePhoto() {
  try {
    await photosAdminApi.deletePhoto(id.value)
    notification.success({
      message: 'Success',
      description: 'Photo deleted successfully!'
    })
    if (props.variant === 'modal') {
      emit('deleted')
    } else {
      await navigateTo('/admin/photos')
    }
  } catch (e) {
    showFromError(e)
  }
}

watch(id, () => load(), { immediate: true })
</script>
