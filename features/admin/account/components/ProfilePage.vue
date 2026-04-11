<template>
  <a-card title="Profile">
    <a-spin :spinning="loading">
      <div v-if="user" class="space-y-8">
        <div class="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-slate-100 shadow-sm">
          <div class="h-44 w-full sm:h-52">
            <img
              v-if="displayCoverUrl"
              :key="displayCoverUrl"
              :src="displayCoverUrl"
              alt=""
              class="h-full w-full object-cover"
            >
            <div
              v-else
              class="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 text-sm text-slate-500"
            >
              No cover photo
            </div>
          </div>
          <div
            class="relative flex flex-col gap-4 border-t border-slate-200/80 bg-white px-4 pb-5 pt-0 sm:flex-row sm:items-end sm:gap-6 sm:px-6"
          >
            <div class="-mt-12 shrink-0 sm:-mt-14">
              <div
                class="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-slate-100 shadow-md ring-1 ring-slate-200/80 sm:h-28 sm:w-28"
              >
                <img
                  v-if="displayAvatarUrl"
                  :key="displayAvatarUrl"
                  :src="displayAvatarUrl"
                  alt=""
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center text-2xl font-semibold text-slate-400">
                  {{ (user.name || user.username || '?').charAt(0).toUpperCase() }}
                </div>
              </div>
            </div>
            <div class="min-w-0 flex-1 pb-1 pt-2 sm:pt-0">
              <h2 class="font-[family-name:var(--font-portfolio-heading)] text-xl font-semibold text-portfolio-ink sm:text-2xl">
                {{ user.name || user.username || '—' }}
              </h2>
              <p class="mt-0.5 text-sm text-slate-600">
                @{{ user.username || '—' }}
              </p>
              <p class="mt-1 text-sm text-slate-500">
                {{ user.email || '—' }}
              </p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-if="roleLabel"
                  class="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80"
                >
                  {{ roleLabel }}
                </span>
                <span
                  class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset"
                  :class="user.is_active ? 'bg-emerald-50 text-emerald-800 ring-emerald-200/80' : 'bg-slate-100 text-slate-600 ring-slate-200/80'"
                >
                  {{ user.is_active ? 'Active' : 'Inactive' }}
                </span>
                <span class="inline-flex rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-900 ring-1 ring-amber-200/70">
                  Violations: {{ Number(user.violation_count) || 0 }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="user.location || user.bio" class="grid gap-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4 sm:grid-cols-2">
          <div v-if="user.location">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Location
            </p>
            <p class="mt-1 text-sm text-slate-800">
              {{ user.location }}
            </p>
          </div>
          <div v-if="user.bio" class="sm:col-span-2">
            <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Bio
            </p>
            <p class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {{ user.bio }}
            </p>
          </div>
        </div>

        <div>
          <h3 class="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            Edit profile
          </h3>
          <div class="max-w-2xl space-y-4">
            <div>
              <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Name</label>
              <a-input v-model:value="form.name" size="large" allow-clear />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Username</label>
              <a-input v-model:value="form.username" size="large" allow-clear />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Email</label>
              <a-input v-model:value="form.email" size="large" type="email" allow-clear />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Location</label>
              <a-input v-model:value="form.location" size="large" allow-clear />
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-medium text-portfolio-ink">Bio</label>
              <a-textarea v-model:value="form.bio" :rows="4" placeholder="Short bio…" />
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
              <div class="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm">
                <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Profile picture
                </p>
                <div
                  v-if="editProfileThumbSrc"
                  class="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <img
                    :key="editProfileThumbSrc"
                    :src="editProfileThumbSrc"
                    alt=""
                    class="mx-auto max-h-40 w-full max-w-xs object-contain"
                  >
                </div>
                <label class="admin-file-input">
                  <input ref="profileInputRef" class="sr-only" type="file" accept="image/*" @change="onProfileFile">
                  <span class="pointer-events-none">{{ profilePicFile ? 'Change photo' : 'Upload new photo' }}</span>
                </label>
              </div>
              <div class="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-4 shadow-sm">
                <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cover photo
                </p>
                <div
                  v-if="editCoverThumbSrc"
                  class="mb-3 overflow-hidden rounded-xl border border-slate-200 bg-white"
                >
                  <img
                    :key="editCoverThumbSrc"
                    :src="editCoverThumbSrc"
                    alt=""
                    class="max-h-36 w-full object-cover"
                  >
                </div>
                <label class="admin-file-input">
                  <input ref="coverInputRef" class="sr-only" type="file" accept="image/*" @change="onCoverFile">
                  <span class="pointer-events-none">{{ coverPicFile ? 'Change cover' : 'Upload new cover' }}</span>
                </label>
              </div>
            </div>

            <div class="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
              <a-button type="primary" size="large" :loading="saving" @click="onSubmit">
                Save changes
          </a-button>
            </div>
          </div>
        </div>
      </div>
      <a-empty v-else-if="!loading" description="Could not load profile." />
    </a-spin>
  </a-card>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { notification } from 'ant-design-vue'
import { accountAdminApi } from '~/features/admin/account/services/account.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminAuthStore } from '~/stores/adminAuthStore.js'
import { setAdminSession, getAdminToken } from '~/features/admin/services/adminClient'

const { showFromError } = useApiErrorMessage()
const adminAuth = useAdminAuthStore()
const runtimeConfig = useRuntimeConfig()

const loading = ref(true)
const saving = ref(false)
const user = ref(null)
const form = ref({
  name: '',
  username: '',
  email: '',
  location: '',
  bio: ''
})

const profilePicFile = ref(null)
const coverPicFile = ref(null)
const profilePreviewUrl = ref('')
const coverPreviewUrl = ref('')
const profileInputRef = ref(null)
const coverInputRef = ref(null)

const mediaBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, ''))

function mediaUrl(path) {
  if (path == null || path === '') {
    return ''
  }
  const p = String(path)
  if (/^https?:\/\//i.test(p) || p.startsWith('blob:')) {
    return p
  }
  return `${mediaBase.value}${p.startsWith('/') ? '' : '/'}${p}`
}

const displayAvatarUrl = computed(() => profilePreviewUrl.value || mediaUrl(user.value?.profile_picture))
const displayCoverUrl = computed(() => coverPreviewUrl.value || mediaUrl(user.value?.cover_photo))

/** Preview trong khối Edit (blob ưu tiên, không thì URL từ user). */
const editProfileThumbSrc = computed(() => displayAvatarUrl.value || '')
const editCoverThumbSrc = computed(() => displayCoverUrl.value || '')

const roleLabel = computed(() => {
  const r = user.value?.role
  if (!r || typeof r !== 'object') {
    return ''
  }
  return r.roleName || r.role_name || r.name || ''
})

function revokeBlob(url) {
  if (url && String(url).startsWith('blob:')) {
    URL.revokeObjectURL(url)
  }
}

function clearFilePreviews() {
  revokeBlob(profilePreviewUrl.value)
  profilePreviewUrl.value = ''
  revokeBlob(coverPreviewUrl.value)
  coverPreviewUrl.value = ''
  profilePicFile.value = null
  coverPicFile.value = null
  if (profileInputRef.value) {
    profileInputRef.value.value = ''
  }
  if (coverInputRef.value) {
    coverInputRef.value.value = ''
  }
}

function onProfileFile(e) {
  const f = e.target?.files?.[0] || null
  profilePicFile.value = f
  revokeBlob(profilePreviewUrl.value)
  profilePreviewUrl.value = f ? URL.createObjectURL(f) : ''
}

function onCoverFile(e) {
  const f = e.target?.files?.[0] || null
  coverPicFile.value = f
  revokeBlob(coverPreviewUrl.value)
  coverPreviewUrl.value = f ? URL.createObjectURL(f) : ''
}

function applyUserToForm(u) {
  form.value = {
    name: u.name ?? '',
    username: u.username ?? '',
    email: u.email ?? '',
    location: u.location ?? '',
    bio: u.bio ?? ''
  }
}

async function load() {
  loading.value = true
  try {
    const res = await accountAdminApi.profile()
    const body = res?.data
    const u = body && typeof body === 'object' ? (body.user ?? body) : null
    if (!u || typeof u !== 'object' || u.id == null) {
      notification.error({
        message: 'Error',
        description: 'Could not read profile from the server.'
      })
      return
    }
    user.value = u
    applyUserToForm(u)
    clearFilePreviews()
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  if (!form.value.username?.trim() || !form.value.email?.trim()) {
    notification.error({
      message: 'Error',
      description: 'Username and email are required.'
    })
    return
  }
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('name', String(form.value.name || '').trim())
    fd.append('username', form.value.username.trim())
    fd.append('email', form.value.email.trim())
    fd.append('location', String(form.value.location || '').trim())
    fd.append('bio', String(form.value.bio || ''))
    if (profilePicFile.value) {
      fd.append('profile_picture', profilePicFile.value)
    }
    if (coverPicFile.value) {
      fd.append('cover_photo', coverPicFile.value)
    }
    const { data } = await accountAdminApi.updateProfile(fd)
    notification.success({
      message: 'Success',
      description: typeof data?.message === 'string' ? data.message : 'Profile updated successfully!'
    })
    const token = getAdminToken()
    const nextUser = data?.user ?? (data?.id ? data : null)
    if (nextUser && typeof nextUser === 'object' && token) {
      setAdminSession(token, nextUser)
      adminAuth.user = nextUser
    }
    await load()
  } catch (e) {
    showFromError(e)
  } finally {
    saving.value = false
  }
}

onMounted(() => load())

onUnmounted(() => {
  revokeBlob(profilePreviewUrl.value)
  revokeBlob(coverPreviewUrl.value)
})
</script>
