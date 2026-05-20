<template>
  <section class="review-studio">
    <header class="studio-header">
      <div>
        <p class="studio-eyebrow">Jury review studio</p>
        <h2>Final scoring queue</h2>
      </div>
      <div class="studio-progress">
        <span>{{ scoredCount }} of {{ submissions.length }} scored</span>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }" />
        </div>
      </div>
      <a-button :loading="loading" class="!h-10 !rounded-xl !border-white/15 !bg-white/10 !text-white hover:!bg-white/15" @click="fetchRows">
        <i class="fa-solid fa-rotate-right mr-2 text-xs" aria-hidden="true" />
        Refresh
      </a-button>
    </header>

    <a-spin :spinning="loading">
      <div v-if="selectedSubmission" class="studio-layout">
        <main class="photo-review">
          <div class="photo-topline">
            <div>
              <span>{{ selectedSubmission.quest?.title || 'Quest' }}</span>
              <strong>{{ selectedSubmission.title || 'Untitled submission' }}</strong>
            </div>
            <div class="deadline-pill">Judge until {{ formatDateTime(selectedSubmission.quest?.judging_end_at) }}</div>
          </div>

          <div class="photo-canvas">
            <img :src="selectedSubmission.image_url" :alt="selectedSubmission.title || 'Submission'">
          </div>

          <div class="filmstrip">
            <button
              v-for="submission in submissions"
              :key="submission.id"
              type="button"
              class="film-item"
              :class="{ active: selectedId === submission.id, scored: submission.reviews?.length }"
              @click="selectSubmission(submission)"
            >
              <img :src="submission.image_url" :alt="submission.title || 'Submission'">
              <span>{{ submission.reviews?.length ? 'Scored' : 'Pending' }}</span>
            </button>
          </div>
        </main>

        <aside class="score-sidebar">
          <div class="sidebar-section border-b border-slate-100 pb-5">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="panel-label">Submission</p>
                <h3>{{ selectedSubmission.title || 'Untitled' }}</h3>
              </div>
              <span class="review-state" :class="currentReview ? 'done' : 'todo'">
                {{ currentReview ? 'Scored' : 'Pending' }}
              </span>
            </div>
            <p class="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">
              {{ selectedSubmission.description || 'No description' }}
            </p>
            <div class="mt-3 text-sm text-slate-500">
              By <strong class="text-slate-800">{{ selectedSubmission.user?.name || selectedSubmission.user?.username || selectedSubmission.user?.email || 'User' }}</strong>
            </div>
          </div>

          <div class="sidebar-section">
            <div class="total-card">
              <div>
                <span>Total</span>
                <strong>{{ totalScore.toFixed(1) }}</strong>
              </div>
              <p>Weighted score</p>
            </div>

            <div class="criteria-list">
              <div v-for="criterion in criteria" :key="criterion.key" class="criterion">
                <div class="criterion-head">
                  <div>
                    <strong>{{ criterion.label }}</strong>
                    <span>{{ criterion.help }}</span>
                  </div>
                  <em>{{ scoreForm[criterion.key] }}/10</em>
                </div>
                <div class="rating-grid">
                  <button
                    v-for="value in scoreValues"
                    :key="value"
                    type="button"
                    class="rating-button"
                    :class="{ active: Number(scoreForm[criterion.key]) === value }"
                    @click="scoreForm[criterion.key] = value"
                  >
                    {{ value }}
                  </button>
                </div>
              </div>
            </div>

            <a-textarea
              v-model:value="comment"
              class="!mt-5 !rounded-xl"
              :rows="4"
              placeholder="Add a short jury note"
            />

            <div class="mt-5 grid grid-cols-2 gap-2">
              <a-button class="!h-11 !rounded-xl !font-semibold" :disabled="!previousSubmission" @click="goPrevious">
                Previous
              </a-button>
              <a-button class="!h-11 !rounded-xl !font-semibold" :disabled="!nextSubmission" @click="goNext">
                Next
              </a-button>
            </div>
            <a-button type="primary" block size="large" class="mt-3 !h-12 !rounded-xl !font-semibold" :loading="saving" @click="saveReview(true)">
              Save & next
            </a-button>
            <a-button block size="large" class="mt-2 !h-11 !rounded-xl !font-semibold" :loading="saving" @click="saveReview(false)">
              Save only
            </a-button>
          </div>
        </aside>
      </div>

      <a-empty v-else description="Chưa có submission cần chấm" class="rounded-2xl border border-dashed border-white/15 bg-white/5 py-14 [&_.ant-empty-description]:!text-white/70" />
    </a-spin>
  </section>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { questApi } from '~/features/quests/services/quest.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const submissions = ref([])
const selectedId = ref(null)
const loading = ref(false)
const saving = ref(false)
const comment = ref('')
const scoreValues = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const criteria = [
  { key: 'brandFit', label: 'Brand fit', help: 'Đúng brief, đúng chủ đề', weight: 0.4 },
  { key: 'storytelling', label: 'Storytelling', help: 'Câu chuyện và cảm xúc', weight: 0.3 },
  { key: 'usability', label: 'Usability', help: 'Tính ứng dụng trong bối cảnh quest', weight: 0.2 },
  { key: 'creativity', label: 'Creativity', help: 'Ý tưởng và góc nhìn mới', weight: 0.1 }
]
const scoreForm = reactive({
  brandFit: 8,
  storytelling: 8,
  usability: 8,
  creativity: 8
})

const selectedSubmission = computed(() => submissions.value.find(item => item.id === selectedId.value) || null)
const currentReview = computed(() => selectedSubmission.value?.reviews?.[0] || null)
const selectedIndex = computed(() => submissions.value.findIndex(item => item.id === selectedId.value))
const previousSubmission = computed(() => selectedIndex.value > 0 ? submissions.value[selectedIndex.value - 1] : null)
const nextSubmission = computed(() => selectedIndex.value >= 0 ? submissions.value[selectedIndex.value + 1] || null : null)
const scoredCount = computed(() => submissions.value.filter(item => item.reviews?.length).length)
const progressPercent = computed(() => submissions.value.length ? Math.round((scoredCount.value / submissions.value.length) * 100) : 0)
const totalScore = computed(() =>
  criteria.reduce((sum, criterion) => sum + Number(scoreForm[criterion.key] || 0) * criterion.weight, 0)
)

async function fetchRows() {
  loading.value = true
  try {
    const { data } = await questApi.jurySubmissions({ size: 80 })
    submissions.value = data.submissions?.data || []
    if (!selectedId.value || !submissions.value.some(item => item.id === selectedId.value)) {
      selectedId.value = firstPendingSubmission()?.id || submissions.value[0]?.id || null
    }
    if (selectedSubmission.value) {
      hydrateReview(selectedSubmission.value)
    }
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load jury submissions') })
  } finally {
    loading.value = false
  }
}

function firstPendingSubmission() {
  return submissions.value.find(item => !item.reviews?.length)
}

function selectSubmission(submission) {
  selectedId.value = submission.id
  hydrateReview(submission)
}

function hydrateReview(submission) {
  const review = submission.reviews?.[0]
  const scores = review?.scores || {}
  scoreForm.brandFit = Number(scores.brandFit ?? 8)
  scoreForm.storytelling = Number(scores.storytelling ?? 8)
  scoreForm.usability = Number(scores.usability ?? 8)
  scoreForm.creativity = Number(scores.creativity ?? 8)
  comment.value = review?.comment || ''
}

function goPrevious() {
  if (previousSubmission.value) {
    selectSubmission(previousSubmission.value)
  }
}

function goNext() {
  if (nextSubmission.value) {
    selectSubmission(nextSubmission.value)
  }
}

async function saveReview(moveNext = false) {
  if (!selectedSubmission.value) {
    return
  }
  const currentId = selectedSubmission.value.id
  saving.value = true
  try {
    await questApi.review(currentId, {
      scores: {
        brandFit: scoreForm.brandFit,
        storytelling: scoreForm.storytelling,
        usability: scoreForm.usability,
        creativity: scoreForm.creativity
      },
      comment: comment.value || ''
    })
    notification.success({ message: 'Đã lưu điểm chấm' })
    await fetchRows()
    if (moveNext) {
      const currentIndex = submissions.value.findIndex(item => item.id === currentId)
      const target = submissions.value.slice(currentIndex + 1).find(item => !item.reviews?.length) || submissions.value[currentIndex + 1]
      if (target) {
        selectSubmission(target)
      }
    }
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to save score') })
  } finally {
    saving.value = false
  }
}

function formatDateTime(value) {
  if (!value) {
    return '—'
  }
  const [date, time = ''] = String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').split(' ')
  return `${date} ${time.slice(0, 5)}`.trim()
}

onMounted(fetchRows)
</script>

<style scoped>
.review-studio {
  overflow: hidden;
  border-radius: 24px;
  background: #08111f;
  color: #ffffff;
  box-shadow: 0 18px 55px rgb(15 23 42 / 0.18);
}

.studio-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px auto;
  gap: 18px;
  align-items: center;
  border-bottom: 1px solid rgb(255 255 255 / 0.10);
  padding: 18px 20px;
}

.studio-eyebrow {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: #93c5fd;
}

.studio-header h2 {
  margin-top: 4px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: 0;
}

.studio-progress span {
  display: block;
  margin-bottom: 7px;
  color: rgb(255 255 255 / 0.72);
  font-size: 13px;
  font-weight: 700;
}

.progress-track {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 0.12);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: #60a5fa;
}

.studio-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  min-height: 720px;
}

.photo-review {
  min-width: 0;
  padding: 18px;
}

.photo-topline {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.photo-topline span {
  display: block;
  color: rgb(255 255 255 / 0.55);
  font-size: 13px;
  font-weight: 700;
}

.photo-topline strong {
  margin-top: 4px;
  display: block;
  color: #ffffff;
  font-size: 18px;
  font-weight: 800;
}

.deadline-pill {
  border-radius: 999px;
  background: rgb(255 255 255 / 0.10);
  padding: 7px 11px;
  color: rgb(255 255 255 / 0.74);
  font-size: 12px;
  font-weight: 800;
}

.photo-canvas {
  display: flex;
  min-height: 540px;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  background: #020617;
}

.photo-canvas img {
  max-height: 70vh;
  width: 100%;
  object-fit: contain;
}

.filmstrip {
  margin-top: 14px;
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.film-item {
  position: relative;
  height: 82px;
  width: 112px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 2px solid transparent;
  border-radius: 14px;
  background: rgb(255 255 255 / 0.08);
}

.film-item.active {
  border-color: #60a5fa;
}

.film-item.scored::after {
  position: absolute;
  top: 6px;
  right: 6px;
  height: 10px;
  width: 10px;
  border-radius: 999px;
  background: #34d399;
  content: '';
}

.film-item img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.film-item span {
  position: absolute;
  left: 6px;
  bottom: 6px;
  border-radius: 999px;
  background: rgb(0 0 0 / 0.55);
  padding: 2px 7px;
  color: #ffffff;
  font-size: 11px;
  font-weight: 800;
}

.score-sidebar {
  border-left: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
}

.sidebar-section {
  padding: 18px;
}

.panel-label {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.score-sidebar h3 {
  margin-top: 5px;
  font-size: 18px;
  font-weight: 800;
}

.review-state {
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 12px;
  font-weight: 800;
}

.review-state.done {
  background: #ecfdf5;
  color: #047857;
}

.review-state.todo {
  background: #fffbeb;
  color: #b45309;
}

.total-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 18px;
  background: #eff6ff;
  padding: 14px;
}

.total-card span,
.total-card p {
  color: #2563eb;
  font-size: 12px;
  font-weight: 800;
}

.total-card strong {
  display: block;
  color: #172554;
  font-size: 38px;
  line-height: 1;
}

.criteria-list {
  margin-top: 18px;
  display: grid;
  gap: 16px;
}

.criterion-head {
  margin-bottom: 9px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.criterion-head strong {
  display: block;
  font-size: 14px;
  color: #0f172a;
}

.criterion-head span {
  margin-top: 2px;
  display: block;
  font-size: 12px;
  color: #64748b;
}

.criterion-head em {
  font-style: normal;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
}

.rating-grid {
  display: grid;
  grid-template-columns: repeat(10, minmax(0, 1fr));
  gap: 4px;
}

.rating-button {
  height: 30px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 900;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.rating-button:hover,
.rating-button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: #ffffff;
}

@media (max-width: 1180px) {
  .studio-header,
  .studio-layout {
    grid-template-columns: 1fr;
  }

  .score-sidebar {
    border-left: 0;
    border-top: 1px solid #e2e8f0;
  }
}
</style>
