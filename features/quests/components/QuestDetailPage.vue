<template>
  <main class="min-h-screen bg-white">
    <a-spin :spinning="loading">
      <template v-if="quest">
        <section class="relative min-h-[56vh] overflow-hidden bg-zinc-950">
          <div class="absolute inset-0 bg-[linear-gradient(135deg,#111827_0%,#334155_50%,#e5e7eb_100%)]" />
          <img
            v-if="previewUrl"
            :src="previewUrl"
            alt=""
            class="absolute inset-0 h-full w-full object-cover opacity-50"
          >
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />
          <div class="relative mx-auto flex min-h-[56vh] max-w-[1500px] flex-col justify-end px-4 pb-10 pt-24 sm:px-6 lg:px-8">
            <NuxtLink to="/quests" class="mb-8 inline-flex w-fit items-center rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20">
              <i class="fa-solid fa-arrow-left mr-2 text-xs" aria-hidden="true" />
              Quests
            </NuxtLink>
            <div class="max-w-4xl">
              <div class="mb-4 flex flex-wrap gap-2">
                <span class="rounded-full bg-white px-3 py-1 text-xs font-bold text-zinc-950">{{ quest.status }}</span>
                <span class="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur">{{ formatDate(quest.start_at) }} - {{ formatDate(quest.end_at) }}</span>
              </div>
              <h1 class="text-4xl font-bold tracking-tight text-white sm:text-6xl font-[family-name:var(--font-portfolio-heading)]">
                {{ quest.title }}
              </h1>
              <p class="mt-5 max-w-2xl text-base leading-7 text-white/78 sm:text-lg">
                {{ quest.description || quest.brief || 'Open for submissions' }}
              </p>
            </div>
          </div>
        </section>

        <section class="mx-auto grid max-w-[1500px] gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div class="space-y-10">
            <section class="border-b border-zinc-100 pb-8">
              <h2 class="text-xl font-semibold text-zinc-950">Brief</h2>
              <p class="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-zinc-600">
                {{ quest.brief || 'No brief' }}
              </p>
            </section>

            <section class="border-b border-zinc-100 pb-8">
              <h2 class="text-xl font-semibold text-zinc-950">Rules</h2>
              <p class="mt-3 max-w-3xl whitespace-pre-line text-[15px] leading-7 text-zinc-600">
                {{ quest.rules || 'No rules' }}
              </p>
            </section>

            <section>
              <div class="mb-4 flex items-center justify-between gap-4">
                <h2 class="text-xl font-semibold text-zinc-950">Rewards</h2>
                <span class="text-sm text-zinc-500">{{ quest.max_submissions_per_user || 1 }} submissions max</span>
              </div>
              <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div class="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Approved</div>
                  <div class="mt-2 text-2xl font-bold text-zinc-950">{{ quest.reward_config?.participation?.star || 0 }} star</div>
                </div>
                <div class="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
                  <div class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Shortlisted</div>
                  <div class="mt-2 text-2xl font-bold text-zinc-950">{{ quest.reward_config?.shortlist?.star || 0 }} star</div>
                </div>
                <div
                  v-for="range in quest.reward_config?.ranks || []"
                  :key="`${range.from}-${range.to}`"
                  class="rounded-xl border border-zinc-100 bg-white p-4 shadow-sm"
                >
                  <div class="text-xs font-semibold uppercase tracking-wide text-zinc-500">Rank {{ range.from }} to {{ range.to }}</div>
                  <div class="mt-2 text-lg font-bold text-zinc-950">
                    {{ range.rewards?.coin || 0 }} coin
                    <span class="text-zinc-400">/</span>
                    {{ range.rewards?.star || 0 }} star
                  </div>
                </div>
              </div>
            </section>
          </div>

          <aside class="lg:sticky lg:top-[76px] lg:self-start">
            <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
              <label
                class="group relative block aspect-[4/3] cursor-pointer overflow-hidden bg-zinc-100"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
              >
                <input ref="fileInputRef" class="sr-only" type="file" accept="image/jpeg,image/png,image/jpg,image/gif,image/webp" @change="onFileChange">
                <img
                  v-if="previewUrl"
                  :src="previewUrl"
                  alt="Submission preview"
                  class="h-full w-full object-cover"
                >
                <div
                  v-else
                  class="flex h-full w-full flex-col items-center justify-center gap-4 px-6 text-center text-zinc-500 transition"
                  :class="dragging ? 'bg-zinc-200' : 'bg-zinc-100 group-hover:bg-zinc-200'"
                >
                  <span class="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
                    <i class="fa-regular fa-image text-3xl text-zinc-700" aria-hidden="true" />
                  </span>
                  <span>
                    <span class="block text-base font-semibold text-zinc-950">Upload photo</span>
                    <span class="mt-1 block text-sm leading-6 text-zinc-500">Click or drag an image here</span>
                  </span>
                </div>
                <div
                  v-if="previewUrl"
                  class="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-16"
                >
                  <p class="truncate text-sm font-semibold text-white">{{ submitForm.title || selectedFile?.name || 'Your submission' }}</p>
                  <p class="mt-1 text-xs text-white/70">Click image to replace</p>
                </div>
              </label>
              <a-form layout="vertical" :model="submitForm" class="quest-submit-form" @finish="submit">
                <div class="px-5 py-5 sm:px-6">
                  <div class="mb-5">
                    <h2 class="text-lg font-semibold tracking-tight text-zinc-950">Gửi photo</h2>
                    <p class="mt-1 text-sm leading-6 text-zinc-500">Ảnh sẽ được gửi cho editor duyệt trước khi vào quest.</p>
                  </div>

                  <div class="space-y-5">
                    <a-form-item>
                      <template #label>
                        <span class="text-sm font-semibold text-zinc-800">Title</span>
                      </template>
                      <a-input
                        v-model:value="submitForm.title"
                        size="large"
                        placeholder="Đặt tên cho ảnh"
                        class="!h-12 !rounded-xl"
                      />
                    </a-form-item>
                    <a-form-item>
                      <template #label>
                        <span class="text-sm font-semibold text-zinc-800">Description</span>
                      </template>
                      <a-textarea
                        v-model:value="submitForm.description"
                        :rows="5"
                        placeholder="Mô tả ngắn về ảnh"
                        class="!rounded-xl"
                      />
                    </a-form-item>
                  </div>
                </div>

                <div class="border-t border-zinc-100 bg-zinc-50/80 px-5 py-4 sm:px-6">
                  <a-button type="primary" html-type="submit" block size="large" :loading="submitting" class="!h-12 !rounded-full !font-semibold">
                    Gửi photo
                  </a-button>
                </div>
              </a-form>
            </div>
          </aside>
        </section>
      </template>
    </a-spin>
  </main>
</template>

<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { questApi } from '~/features/quests/services/quest.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const route = useRoute()
const quest = ref(null)
const loading = ref(false)
const submitting = ref(false)
const dragging = ref(false)
const selectedFile = ref(null)
const previewUrl = ref('')
const fileInputRef = ref(null)
const submitForm = reactive({ title: '', description: '' })

async function fetchQuest() {
  loading.value = true
  try {
    const { data } = await questApi.quest(route.params.id)
    quest.value = data.quest
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load quest') })
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!selectedFile.value) {
    notification.warning({ message: 'Vui lòng chọn ảnh để gửi.' })
    return
  }

  submitting.value = true
  try {
    const formData = new FormData()
    formData.append('image', selectedFile.value)
    formData.append('title', submitForm.title || '')
    formData.append('description', submitForm.description || '')

    await questApi.submit(route.params.id, formData)
    notification.success({ message: 'Submitted for review' })
    resetSubmitForm()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to submit photo') })
  } finally {
    submitting.value = false
  }
}

function formatDate(value) {
  return value ? String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '') : '—'
}

function onFileChange(event) {
  const file = event.target?.files?.[0] || null
  setSelectedFile(file)
}

function onDrop(event) {
  dragging.value = false
  const file = event.dataTransfer?.files?.[0] || null
  setSelectedFile(file)
}

function setSelectedFile(file) {
  if (!file) {
    return
  }
  if (!file.type?.startsWith('image/')) {
    notification.warning({ message: 'File phải là ảnh.' })
    return
  }
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
  selectedFile.value = file
  previewUrl.value = URL.createObjectURL(file)
}

function resetSubmitForm() {
  Object.assign(submitForm, { title: '', description: '' })
  selectedFile.value = null
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
    previewUrl.value = ''
  }
  if (fileInputRef.value) {
    fileInputRef.value.value = ''
  }
}

onMounted(fetchQuest)
onBeforeUnmount(() => {
  if (previewUrl.value) {
    URL.revokeObjectURL(previewUrl.value)
  }
})
</script>

<style scoped>
.quest-submit-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.quest-submit-form :deep(.ant-form-item-label) {
  padding-bottom: 8px;
}

.quest-submit-form :deep(.ant-input),
.quest-submit-form :deep(.ant-input-number),
.quest-submit-form :deep(textarea.ant-input) {
  border-color: rgb(212 212 216);
  box-shadow: none;
}

.quest-submit-form :deep(.ant-input:focus),
.quest-submit-form :deep(.ant-input-focused),
.quest-submit-form :deep(textarea.ant-input:focus) {
  border-color: rgb(24 119 242);
  box-shadow: 0 0 0 3px rgb(24 119 242 / 0.12);
}
</style>
