<template>
  <div class="submission-workspace">
    <section class="workspace-column">
      <div class="workspace-head">
        <div>
          <h2>Quests</h2>
          <p>Chỉ hiển thị quest đang mở để duyệt bài</p>
        </div>
        <a-button :loading="loadingQuests" @click="fetchQuests">
          <i class="fa-solid fa-rotate-right text-xs" aria-hidden="true" />
        </a-button>
      </div>
      <div class="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
        Open quests only
      </div>
      <a-spin :spinning="loadingQuests">
        <div class="workspace-scroll workspace-list-scroll space-y-3">
          <button
            v-for="quest in quests"
            :key="quest.id"
            type="button"
            class="quest-picker"
            :class="{ 'quest-picker-active': selectedQuestId === quest.id }"
            @click="selectQuest(quest.id)"
          >
            <div class="flex items-start justify-between gap-3">
              <span class="line-clamp-2 text-left text-sm font-semibold text-slate-950">{{ quest.title }}</span>
              <a-tag :color="questStatusColor(quest.status)" class="!m-0">{{ statusLabel(quest.status) }}</a-tag>
            </div>
            <div class="mt-3 grid gap-1 text-left text-xs text-slate-500">
              <span>Submit: {{ formatShortDateTime(quest.start_at) }} - {{ formatShortDateTime(quest.end_at) }}</span>
              <span>Judge: {{ formatShortDateTime(quest.judging_start_at || quest.end_at) }} - {{ formatShortDateTime(quest.judging_end_at) }}</span>
            </div>
          </button>
          <a-empty v-if="!loadingQuests && quests.length === 0" description="No quests" />
        </div>
      </a-spin>
    </section>

    <section class="workspace-column">
      <div class="workspace-head">
        <div>
          <h2>Submissions</h2>
          <p>{{ selectedQuest ? selectedQuest.title : 'Chọn quest để xem bài nộp' }}</p>
        </div>
        <a-button :disabled="!selectedQuestId" :loading="loading" @click="fetchRows">Refresh</a-button>
      </div>
      <a-select v-model:value="filters.status" allow-clear placeholder="Submission status" class="mb-4 w-full" @change="refreshRows">
        <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
      </a-select>

      <a-spin :spinning="loading">
        <div class="workspace-scroll workspace-list-scroll space-y-3">
          <button
            v-for="record in rows"
            :key="record.id"
            type="button"
            class="submission-row"
            :class="{ 'submission-row-active': detailRecord?.id === record.id }"
            @click="openSubmissionDetail(record)"
          >
            <img :src="record.image_url" :alt="record.title || 'Submission'" class="h-20 w-28 rounded-lg object-cover">
            <div class="min-w-0 flex-1 text-left">
              <div class="flex items-start justify-between gap-2">
                <strong class="line-clamp-1 text-sm text-slate-950">{{ record.title || 'Untitled' }}</strong>
                <a-tag :color="statusColor(record.status)" class="!m-0">{{ record.status }}</a-tag>
              </div>
              <p class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{{ record.description || 'No description' }}</p>
              <div class="mt-2 text-xs text-slate-400">
                {{ record.user?.name || record.user?.username || record.user?.email || record.user_id }} · {{ formatShortDateTime(record.created_at) }}
              </div>
            </div>
          </button>
          <a-empty v-if="!loading && rows.length === 0" description="No submissions" />
        </div>
      </a-spin>

      <div v-if="pagination.total > pagination.pageSize" class="mt-3">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          size="small"
          :total="pagination.total"
          show-size-changer
          @change="fetchRows"
        />
      </div>
    </section>

    <aside class="workspace-column workspace-detail">
      <div class="workspace-head">
        <div>
          <h2>{{ detailRecord ? 'Submission detail' : 'Quest detail' }}</h2>
          <p>{{ detailRecord ? 'Thông tin bài nộp đang chọn' : 'Yêu cầu cuộc thi đang chọn' }}</p>
        </div>
        <a-button v-if="detailRecord" class="!h-9 !rounded-lg !px-3" @click="detailRecord = null">
          <i class="fa-solid fa-clipboard-list mr-2 text-xs" aria-hidden="true" />
          Quest info
        </a-button>
      </div>

      <div class="workspace-scroll">
        <template v-if="detailRecord">
          <a :href="detailRecord.image_url" target="_blank" rel="noreferrer" class="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
            <img :src="detailRecord.image_url" :alt="detailRecord.title || 'Submission'" class="max-h-[360px] w-full object-contain">
          </a>
          <div class="mt-4 space-y-4">
            <div>
              <div class="detail-label">Title</div>
              <h3 class="mt-1 text-lg font-semibold text-slate-950">{{ detailRecord.title || 'Untitled' }}</h3>
            </div>
            <div>
              <div class="detail-label">User</div>
              <p class="mt-1 text-sm text-slate-700">{{ detailRecord.user?.name || detailRecord.user?.username || detailRecord.user?.email || detailRecord.user_id }}</p>
            </div>
            <div>
              <div class="detail-label">Status</div>
              <a-tag class="mt-2" :color="statusColor(detailRecord.status)">{{ detailRecord.status }}</a-tag>
            </div>
            <div>
              <div class="detail-label">Description</div>
              <p class="mt-1 whitespace-pre-line text-sm leading-6 text-slate-600">{{ detailRecord.description || 'No description' }}</p>
            </div>
            <div class="submission-actions">
              <a-tooltip :title="actionTooltip(detailRecord, 'approve')">
                <span>
                  <a-button class="submission-action-btn approve" :disabled="!canModerate(detailRecord, 'approve')" @click="moderate(detailRecord, 'approve')">
                    <i class="fa-solid fa-check" aria-hidden="true" />
                    Approve
                  </a-button>
                </span>
              </a-tooltip>
              <a-tooltip :title="actionTooltip(detailRecord, 'shortlist')">
                <span>
                  <a-button class="submission-action-btn shortlist" :disabled="!canModerate(detailRecord, 'shortlist')" @click="moderate(detailRecord, 'shortlist')">
                    <i class="fa-solid fa-star" aria-hidden="true" />
                    Shortlist
                  </a-button>
                </span>
              </a-tooltip>
              <a-tooltip :title="actionTooltip(detailRecord, 'reject')">
                <span>
                  <a-button class="submission-action-btn reject" :disabled="!canModerate(detailRecord, 'reject')" @click="moderate(detailRecord, 'reject')">
                    <i class="fa-solid fa-xmark" aria-hidden="true" />
                    Reject
                  </a-button>
                </span>
              </a-tooltip>
            </div>
          </div>
        </template>

        <template v-else-if="selectedQuest">
          <a-spin :spinning="loadingQuestDetail">
            <div class="space-y-4">
              <div>
                <div class="flex items-start justify-between gap-3">
                  <h3 class="text-xl font-semibold text-slate-950">{{ selectedQuest.title }}</h3>
                  <a-tag :color="questStatusColor(selectedQuest.status)" class="!m-0">{{ statusLabel(selectedQuest.status) }}</a-tag>
                </div>
                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{{ selectedQuest.description || 'No description' }}</p>
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div class="quest-info-card">
                  <span>Max</span>
                  <strong>{{ selectedQuest.max_submissions_per_user || 1 }}</strong>
                </div>
                <div class="quest-info-card">
                  <span>Approved</span>
                  <strong>{{ selectedQuest.reward_config?.participation?.star || 0 }} star</strong>
                </div>
                <div class="quest-info-card">
                  <span>Shortlist</span>
                  <strong>{{ selectedQuest.reward_config?.shortlist?.star || 0 }} star</strong>
                </div>
              </div>
              <section class="rounded-xl border border-slate-200 p-4">
                <div class="detail-label">Brief</div>
                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{{ selectedQuest.brief || 'No brief' }}</p>
              </section>
              <section class="rounded-xl border border-slate-200 p-4">
                <div class="detail-label">Rules</div>
                <p class="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{{ selectedQuest.rules || 'No rules' }}</p>
              </section>
              <div class="rounded-xl border border-slate-200">
                <div class="grid grid-cols-3 rounded-t-xl bg-slate-50 px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  <span>Rank</span>
                  <span>Coin</span>
                  <span>Star</span>
                </div>
                <div
                  v-for="range in selectedQuest.reward_config?.ranks || []"
                  :key="`${range.from}-${range.to}`"
                  class="grid grid-cols-3 border-t border-slate-100 px-3 py-2 text-sm text-slate-700"
                >
                  <strong class="text-slate-950">{{ rankLabel(range) }}</strong>
                  <span>{{ numberText(range.rewards?.coin || 0) }}</span>
                  <span>{{ numberText(range.rewards?.star || 0) }}</span>
                </div>
              </div>
            </div>
          </a-spin>
        </template>

        <a-empty v-else description="Select a quest" />
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { questsAdminApi } from '~/features/admin/quests/services/quests.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'
import { useAdminAuthStore } from '~/stores/adminAuthStore.js'

const statuses = ['pending', 'approved', 'rejected', 'shortlisted', 'winner']
const admin = useAdminAuthStore()
const quests = ref([])
const selectedQuestId = ref(null)
const questDetail = ref(null)
const rows = ref([])
const loadingQuests = ref(false)
const loadingQuestDetail = ref(false)
const loading = ref(false)
const detailRecord = ref(null)
const filters = reactive({ status: undefined })
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const selectedQuest = computed(() => questDetail.value || quests.value.find(quest => quest.id === selectedQuestId.value) || null)

const columns = [
  { title: 'Image', key: 'image', width: 120 },
  { title: 'Submission', dataIndex: 'title', key: 'title', ellipsis: true, width: 280 },
  { title: 'User', key: 'user', width: 220 },
  { title: 'Status', key: 'status', width: 130 },
  { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 170 },
  { title: '', key: 'action', width: 190, fixed: 'right' }
]

async function fetchQuests() {
  loadingQuests.value = true
  try {
    const { data } = await questsAdminApi.quests({
      status: 'open',
      page: 1,
      size: 50
    })
    quests.value = data.quests?.data || []
    if (!selectedQuestId.value || !quests.value.some(quest => quest.id === selectedQuestId.value)) {
      selectedQuestId.value = quests.value[0]?.id || null
    }
    if (selectedQuestId.value) {
      await loadSelectedQuest()
    } else {
      questDetail.value = null
      rows.value = []
      pagination.total = 0
    }
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load quests') })
  } finally {
    loadingQuests.value = false
  }
}

async function selectQuest(id) {
  if (selectedQuestId.value === id) {
    return
  }
  selectedQuestId.value = id
  pagination.current = 1
  await loadSelectedQuest()
}

async function loadSelectedQuest() {
  await Promise.all([fetchQuestDetail(), fetchRows()])
}

async function fetchQuestDetail() {
  if (!selectedQuestId.value) {
    return
  }
  loadingQuestDetail.value = true
  try {
    const { data } = await questsAdminApi.quest(selectedQuestId.value)
    questDetail.value = data.quest
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load quest detail') })
  } finally {
    loadingQuestDetail.value = false
  }
}

async function fetchRows() {
  if (!selectedQuestId.value) {
    rows.value = []
    pagination.total = 0
    return
  }
  loading.value = true
  try {
    const { data } = await questsAdminApi.submissions({
      quest_id: selectedQuestId.value,
      status: filters.status,
      page: pagination.current,
      size: pagination.pageSize
    })
    const page = data.submissions
    rows.value = page.data || []
    pagination.total = page.total || 0
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load submissions') })
  } finally {
    loading.value = false
  }
}

function refreshRows() {
  pagination.current = 1
  fetchRows()
}

function onTableChange(p) {
  pagination.current = p.current
  pagination.pageSize = p.pageSize
  fetchRows()
}

function openSubmissionDetail(record) {
  detailRecord.value = record
}

async function moderate(record, action) {
  if (!canModerate(record, action)) {
    notification.warning({ message: actionTooltip(record, action) || 'Không thể thao tác' })
    return
  }
  try {
    if (action === 'approve') {
      await questsAdminApi.approveSubmission(record.id)
    } else if (action === 'shortlist') {
      await questsAdminApi.shortlistSubmission(record.id)
    } else {
      await questsAdminApi.rejectSubmission(record.id)
    }
    notification.success({ message: 'Submission updated' })
    await fetchRows()
    if (detailRecord.value?.id === record.id) {
      detailRecord.value = rows.value.find(item => item.id === record.id) || detailRecord.value
    }
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to update submission') })
  }
}

function actionPermission(action) {
  return {
    approve: 'APPROVE_PHOTO',
    shortlist: 'UPDATE_QUEST',
    reject: 'REJECT_PHOTO'
  }[action]
}

function actionStatusAllowed(record, action) {
  if (action === 'approve') {
    return record.status === 'pending'
  }
  if (action === 'shortlist') {
    return record.status === 'approved'
  }
  return ['pending', 'approved'].includes(record.status)
}

function canModerate(record, action) {
  const permission = actionPermission(action)
  return admin.hasPermission(permission) && actionStatusAllowed(record, action)
}

function actionTooltip(record, action) {
  const permission = actionPermission(action)
  if (!admin.hasPermission(permission)) {
    return admin.permissionTitle(permission)
  }
  if (!actionStatusAllowed(record, action)) {
    return 'Trạng thái hiện tại không cho phép thao tác này'
  }
  return ''
}

function statusColor(status) {
  return { approved: 'green', shortlisted: 'blue', winner: 'gold', rejected: 'red', pending: 'default' }[status] || 'default'
}

function questStatusColor(status) {
  return { open: 'green', judging: 'blue', completed: 'gold', draft: 'default' }[status] || 'default'
}

function statusLabel(status) {
  return { draft: 'Draft', open: 'Open', judging: 'Judging', completed: 'Completed' }[status] || status
}

function formatShortDateTime(value) {
  if (!value) {
    return '—'
  }
  const [date, time = ''] = String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '').split(' ')
  return `${date} ${time.slice(0, 5)}`.trim()
}

function numberText(value) {
  return Number(value || 0).toLocaleString()
}

function rankLabel(range) {
  return Number(range.from) === Number(range.to) ? `#${range.from}` : `#${range.from} - #${range.to}`
}

onMounted(fetchQuests)
</script>

<style scoped>
.submission-workspace {
  display: grid;
  grid-template-columns: minmax(300px, 0.82fr) minmax(460px, 1.18fr) minmax(360px, 0.95fr);
  gap: 16px;
  min-height: calc(100vh - 190px);
  align-items: start;
}

.workspace-column {
  min-width: 0;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #ffffff;
  padding: 16px;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.workspace-detail {
  align-self: start;
}

.workspace-head {
  margin-bottom: 14px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.workspace-head h2 {
  font-size: 18px;
  font-weight: 700;
  color: #0f172a;
}

.workspace-head p {
  margin-top: 4px;
  max-width: 420px;
  font-size: 13px;
  font-weight: 400;
  color: #64748b;
}

.workspace-scroll {
  max-height: calc(100vh - 286px);
  overflow: auto;
  padding-right: 4px;
}

.workspace-list-scroll {
  padding-top: 6px;
}

.quest-picker {
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  padding: 14px;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.quest-picker:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.quest-picker-active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.10);
}

.quest-info-card {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #f8fafc;
  padding: 14px;
}

.quest-info-card span {
  display: block;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.quest-info-card strong {
  margin-top: 8px;
  display: block;
  color: #0f172a;
}

.submission-row {
  display: flex;
  width: 100%;
  gap: 12px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: #ffffff;
  padding: 10px;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;
}

.submission-row:hover {
  border-color: #bfdbfe;
  background: #f8fbff;
}

.submission-row-active {
  border-color: #2563eb;
  background: #eff6ff;
  box-shadow: 0 0 0 3px rgb(37 99 235 / 0.10);
}

.detail-label {
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
}

.submission-actions {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  border-top: 1px solid #e2e8f0;
  padding-top: 16px;
}

.submission-actions > span {
  min-width: 0;
}

.submission-action-btn.ant-btn {
  display: inline-flex;
  width: 100%;
  height: 40px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border-radius: 10px;
  font-weight: 700;
}

.submission-action-btn.approve.ant-btn:not(:disabled) {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: #15803d;
}

.submission-action-btn.approve.ant-btn:not(:disabled):hover {
  border-color: #86efac;
  background: #dcfce7;
  color: #166534;
}

.submission-action-btn.shortlist.ant-btn:not(:disabled) {
  border-color: #fde68a;
  background: #fffbeb;
  color: #b45309;
}

.submission-action-btn.shortlist.ant-btn:not(:disabled):hover {
  border-color: #fcd34d;
  background: #fef3c7;
  color: #92400e;
}

.submission-action-btn.reject.ant-btn:not(:disabled) {
  border-color: #fecaca;
  background: #fff1f2;
  color: #e11d48;
}

.submission-action-btn.reject.ant-btn:not(:disabled):hover {
  border-color: #fda4af;
  background: #ffe4e6;
  color: #be123c;
}

@media (max-width: 1440px) {
  .submission-workspace {
    grid-template-columns: minmax(280px, 0.8fr) minmax(420px, 1.15fr) minmax(340px, 0.95fr);
  }
}

@media (max-width: 1180px) {
  .submission-workspace {
    grid-template-columns: 1fr;
  }

  .workspace-detail {
    position: static;
  }

  .workspace-scroll {
    max-height: none;
  }
}
</style>
