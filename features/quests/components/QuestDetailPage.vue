<template>
  <main class="min-h-screen bg-slate-50">
    <a-spin :spinning="loading">
      <template v-if="quest">
        <section class="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
          <div class="mx-auto max-w-[1280px]">
            <NuxtLink to="/quests" class="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-950">
              <i class="fa-solid fa-arrow-left text-xs" aria-hidden="true" />
              Quay lại quests
            </NuxtLink>

            <div class="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <div class="mb-4 flex flex-wrap gap-2">
                  <span class="quest-status" :class="statusClass(quest.status)">{{ statusLabel(quest.status) }}</span>
                  <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {{ quest.max_submissions_per_user || 1 }} ảnh tối đa / user
                  </span>
                </div>
                <h1 class="max-w-4xl text-3xl font-bold tracking-tight text-slate-950 sm:text-5xl font-[family-name:var(--font-portfolio-heading)]">
                  {{ quest.title }}
                </h1>
                <p class="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  {{ quest.description || quest.brief || 'Quest đang nhận ảnh tham gia.' }}
                </p>
              </div>

              <div class="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <div class="text-sm font-semibold text-blue-800">Top reward</div>
                <div class="mt-2 text-3xl font-bold text-blue-950">{{ topReward }}</div>
                <p class="mt-2 text-sm leading-6 text-blue-700">Ảnh đạt rank cao sẽ nhận Coin và Star theo cấu hình giải thưởng.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="mx-auto grid max-w-[1280px] gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
          <div class="space-y-6">
            <section class="quest-panel">
              <div class="quest-section-head">
                <div>
                  <p class="quest-eyebrow">Timeline</p>
                  <h2>Thời gian tham gia</h2>
                </div>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <div class="quest-time-card">
                  <span>Nhận bài</span>
                  <strong>{{ formatDateTime(quest.start_at) }}</strong>
                  <i>đến {{ formatDateTime(quest.end_at) }}</i>
                </div>
                <div class="quest-time-card">
                  <span>Chấm điểm</span>
                  <strong>{{ formatDateTime(quest.judging_start_at || quest.end_at) }}</strong>
                  <i>đến {{ formatDateTime(quest.judging_end_at) }}</i>
                </div>
              </div>
            </section>

            <section class="quest-panel">
              <div class="quest-section-head">
                <div>
                  <p class="quest-eyebrow">Brief</p>
                  <h2>Tiêu chí ảnh cần gửi</h2>
                </div>
              </div>
              <p class="quest-copy">{{ quest.brief || 'Chưa có brief cụ thể cho quest này.' }}</p>
            </section>

            <section class="quest-panel">
              <div class="quest-section-head">
                <div>
                  <p class="quest-eyebrow">Rules</p>
                  <h2>Luật bắt buộc</h2>
                </div>
              </div>
              <p class="quest-copy">{{ quest.rules || 'Chưa có rule cụ thể. Ảnh vẫn cần đúng định dạng và phù hợp nội dung quest.' }}</p>
            </section>

            <section class="quest-panel">
              <div class="quest-section-head">
                <div>
                  <p class="quest-eyebrow">Rewards</p>
                  <h2>Cơ chế nhận thưởng</h2>
                </div>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="quest-reward-card">
                  <span>Ảnh được duyệt</span>
                  <strong>{{ numberText(quest.reward_config?.participation?.star || 0) }} star</strong>
                </div>
                <div class="quest-reward-card">
                  <span>Vào shortlist</span>
                  <strong>{{ numberText(quest.reward_config?.shortlist?.star || 0) }} star</strong>
                </div>
              </div>
              <div class="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <div class="grid grid-cols-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Rank</span>
                  <span>Coin</span>
                  <span>Star</span>
                </div>
                <div
                  v-for="range in rankRewards"
                  :key="`${range.from}-${range.to}`"
                  class="grid grid-cols-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-700"
                >
                  <strong class="text-slate-950">{{ rangeLabel(range) }}</strong>
                  <span>{{ numberText(range.rewards?.coin || 0) }}</span>
                  <span>{{ numberText(range.rewards?.star || 0) }}</span>
                </div>
                <div v-if="rankRewards.length === 0" class="px-4 py-5 text-sm text-slate-500">Chưa cấu hình rank reward.</div>
              </div>
            </section>
          </div>

          <aside class="lg:sticky lg:top-[84px] lg:self-start">
            <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div class="border-b border-slate-100 px-6 py-5 sm:px-8">
                <h2 class="text-lg font-semibold text-slate-950">Gửi photo</h2>
                <p class="mt-1 text-sm text-slate-500">Upload ảnh từ máy. Editor sẽ duyệt trước khi vào quest.</p>
              </div>

              <label
                class="quest-upload-zone group relative block aspect-[4/3] cursor-pointer overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50"
                :class="dragging ? 'border-blue-400 bg-blue-50' : 'hover:border-blue-300 hover:bg-blue-50/50'"
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
                <div v-else class="flex h-full flex-col items-center justify-center px-6 text-center">
                  <span class="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm">
                    <i class="fa-regular fa-image text-2xl" aria-hidden="true" />
                  </span>
                  <strong class="mt-4 text-base text-slate-950">Chọn ảnh để gửi</strong>
                  <span class="mt-1 text-sm leading-6 text-slate-500">Click hoặc kéo thả ảnh vào đây</span>
                </div>
                <div v-if="previewUrl" class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-4 pt-16">
                  <p class="truncate text-sm font-semibold text-white">{{ selectedFile?.name || 'Photo selected' }}</p>
                  <p class="mt-1 text-xs text-white/70">Click ảnh để thay file khác</p>
                </div>
              </label>

              <a-form layout="vertical" :model="submitForm" class="quest-submit-form" @finish="submit">
                <div class="quest-field-stack">
                  <a-form-item>
                    <template #label>
                      <span class="text-sm font-semibold text-slate-800">Tiêu đề</span>
                    </template>
                    <a-input v-model:value="submitForm.title" size="large" placeholder="Ví dụ: Morning workspace" class="!h-11 !rounded-xl !px-4" />
                  </a-form-item>
                  <a-form-item>
                    <template #label>
                      <span class="text-sm font-semibold text-slate-800">Mô tả</span>
                    </template>
                    <a-textarea v-model:value="submitForm.description" :rows="4" placeholder="Mô tả ngắn về ý tưởng hoặc bối cảnh ảnh" class="!rounded-xl !px-4 !py-3" />
                  </a-form-item>
                </div>

                <a-button
                  type="primary"
                  html-type="submit"
                  block
                  size="large"
                  :loading="submitting"
                  :disabled="quest.status !== 'open'"
                  class="mt-6 !h-12 !rounded-xl !font-semibold"
                >
                  {{ quest.status === 'open' ? 'Gửi photo' : 'Quest chưa nhận bài' }}
                </a-button>
              </a-form>
            </div>
          </aside>
        </section>
      </template>
    </a-spin>
  </main>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
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

const rankRewards = computed(() => quest.value?.reward_config?.ranks || [])
const topReward = computed(() => {
  const top = rankRewards.value[0]?.rewards
  return top ? `${numberText(top.coin || 0)} coin + ${numberText(top.star || 0)} star` : 'Đang cập nhật'
})

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
  if (quest.value?.status !== 'open') {
    notification.warning({ message: 'Quest hiện không nhận bài.' })
    return
  }
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
    notification.success({ message: 'Đã gửi ảnh cho editor duyệt' })
    resetSubmitForm()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to submit photo') })
  } finally {
    submitting.value = false
  }
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }
  const [date, time = ''] = String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').split(' ')
  return `${date} ${time.slice(0, 5)}`.trim()
}

function numberText(value) {
  return Number(value || 0).toLocaleString()
}

function rangeLabel(range) {
  return Number(range.from) === Number(range.to) ? `#${range.from}` : `#${range.from} - #${range.to}`
}

function statusLabel(status) {
  return { open: 'Đang mở', judging: 'Đang chấm', completed: 'Hoàn thành', draft: 'Nháp' }[status] || status
}

function statusClass(status) {
  return {
    open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    judging: 'bg-blue-50 text-blue-700 ring-blue-200',
    completed: 'bg-amber-50 text-amber-700 ring-amber-200'
  }[status] || 'bg-slate-100 text-slate-600 ring-slate-200'
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
.quest-panel {
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
  padding: 20px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.quest-section-head {
  margin-bottom: 16px;
}

.quest-section-head h2 {
  margin-top: 4px;
  font-size: 20px;
  font-weight: 700;
  color: #0f172a;
}

.quest-eyebrow {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: #2563eb;
}

.quest-copy {
  white-space: pre-line;
  font-size: 15px;
  line-height: 1.8;
  color: #475569;
}

.quest-time-card,
.quest-reward-card {
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #f8fafc;
  padding: 16px;
}

.quest-time-card span,
.quest-reward-card span {
  display: block;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.quest-time-card strong,
.quest-reward-card strong {
  margin-top: 8px;
  display: block;
  font-size: 18px;
  color: #0f172a;
}

.quest-time-card i {
  margin-top: 4px;
  display: block;
  font-style: normal;
  color: #64748b;
}

.quest-status {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px currentColor;
}

.quest-upload-zone {
  margin: 32px;
}

.quest-submit-form {
  padding: 0 32px 32px;
}

.quest-submit-form :deep(.ant-form-item) {
  margin-bottom: 0;
}

.quest-submit-form :deep(.ant-form-item-label) {
  padding-bottom: 10px;
}

.quest-submit-form :deep(.ant-form-item-label > label) {
  height: auto;
  line-height: 1.35;
}

.quest-submit-form :deep(.ant-form-item-control-input) {
  min-height: auto;
}

.quest-submit-form :deep(.ant-input),
.quest-submit-form :deep(textarea.ant-input) {
  width: 100%;
  box-sizing: border-box;
}

.quest-field-stack {
  display: grid;
  gap: 22px;
}

@media (max-width: 640px) {
  .quest-upload-zone {
    margin: 20px;
  }

  .quest-submit-form {
    padding: 0 20px 24px;
  }
}
</style>
