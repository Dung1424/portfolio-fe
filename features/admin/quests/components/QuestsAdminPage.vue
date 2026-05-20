<template>
  <div class="space-y-4">
    <a-card title="Quest operations">
      <div class="admin-toolbar">
        <a-select v-model:value="filters.status" allow-clear placeholder="Status" class="w-40" @change="fetchQuests">
          <a-select-option v-for="s in questStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-tooltip :title="admin.permissionTitle('CREATE_QUEST')">
          <span>
            <a-button type="primary" class="!h-10 !rounded-lg !px-5 !font-semibold" :disabled="!admin.hasPermission('CREATE_QUEST')" @click="openCreate">
              <i class="fa-solid fa-plus mr-2" aria-hidden="true" />
              New quest
            </a-button>
          </span>
        </a-tooltip>
      </div>
      <a-spin :spinning="loading">
        <a-table :columns="columns" :data-source="rows" row-key="id" :pagination="pagination" :scroll="{ x: 1100 }" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'window'">
              <div class="space-y-2 text-sm text-slate-600">
                <div>
                  <div class="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Submit</div>
                  <div class="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span>{{ formatDatePart(record.start_at) }}</span>
                    <span class="font-medium text-slate-900">{{ formatTimePart(record.start_at) }}</span>
                    <span class="text-slate-300">to</span>
                    <span>{{ formatDatePart(record.end_at) }}</span>
                    <span class="font-medium text-slate-900">{{ formatTimePart(record.end_at) }}</span>
                  </div>
                </div>
                <div class="text-xs text-slate-500">
                  <span class="font-semibold uppercase tracking-wide text-slate-400">Judge</span>
                  <span class="ml-2">{{ formatShortDateTime(record.judging_start_at) }}</span>
                  <span class="mx-1 text-slate-300">to</span>
                  <span>{{ formatShortDateTime(record.judging_end_at) }}</span>
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'reward'">
              <span class="text-slate-700">{{ rewardSummary(record.reward_config) }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space size="small">
                <a-button type="text" class="admin-table-icon-btn" title="View details" @click="openDetail(record)">
                  <i class="fa-solid fa-eye" aria-hidden="true" />
                </a-button>
                <a-tooltip :title="editTooltip(record)">
                  <span>
                    <a-button type="text" class="admin-table-icon-btn" title="Edit" :disabled="!canEditQuest(record)" @click="openEdit(record)">
                      <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
                    </a-button>
                  </span>
                </a-tooltip>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-card>

    <AdminModal v-model="formOpen" :title="editingId ? 'Edit quest' : 'New quest'" size="xl" @close="resetForm">
      <a-form layout="vertical" :model="form" class="mt-1 max-h-[78vh] overflow-y-auto pr-1" @finish="submitForm">
        <a-form-item label="Title" name="title" :rules="[{ required: true, message: 'Enter title' }]">
          <a-input v-model:value="form.title" size="large" />
        </a-form-item>
        <div class="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          Quest is created as <strong>draft</strong>. It will open, enter judging, and complete automatically based on the configured times.
        </div>
        <a-form-item label="Description">
          <a-textarea v-model:value="form.description" :rows="3" />
        </a-form-item>
        <a-form-item label="Brief">
          <a-textarea v-model:value="form.brief" :rows="3" />
        </a-form-item>
        <a-form-item label="Rules">
          <a-textarea v-model:value="form.rules" :rows="3" />
        </a-form-item>
        <div class="grid gap-4 md:grid-cols-3">
          <a-form-item label="Start">
            <a-date-picker v-model:value="form.start_at" show-time value-format="YYYY-MM-DD HH:mm:ss" class="w-full" />
          </a-form-item>
          <a-form-item label="Submission end">
            <a-date-picker v-model:value="form.end_at" show-time value-format="YYYY-MM-DD HH:mm:ss" class="w-full" />
          </a-form-item>
          <a-form-item label="Judging end">
            <a-date-picker v-model:value="form.judging_end_at" show-time value-format="YYYY-MM-DD HH:mm:ss" class="w-full" />
          </a-form-item>
          <a-form-item label="Max submissions">
            <a-input-number v-model:value="form.max_submissions_per_user" :min="1" :max="100" class="!w-full" />
          </a-form-item>
        </div>
        <a-form-item label="Require license">
          <a-switch v-model:checked="form.require_license" />
        </a-form-item>
        <div class="grid gap-4 md:grid-cols-2">
          <a-form-item label="Participation star">
            <a-input-number v-model:value="form.participationStar" :min="0" class="!w-full" />
          </a-form-item>
          <a-form-item label="Shortlist star">
            <a-input-number v-model:value="form.shortlistStar" :min="0" class="!w-full" />
          </a-form-item>
        </div>
        <div class="mb-6 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-sm font-semibold text-slate-900">Rank rewards</h3>
              <p class="mt-1 text-xs text-slate-500">Set reward ranges without editing JSON.</p>
            </div>
            <a-tooltip :title="formPermissionTooltip">
              <span>
                <a-button type="primary" ghost class="!rounded-lg" :disabled="!canSaveCurrentQuest" @click="addRankReward">
                  <i class="fa-solid fa-plus mr-2" aria-hidden="true" />
                  Add range
                </a-button>
              </span>
            </a-tooltip>
          </div>
          <div class="space-y-3">
            <div
              v-for="(row, index) in form.rankRewards"
              :key="index"
              class="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto]"
            >
              <a-form-item label="From rank" class="!mb-0">
                <a-input-number v-model:value="row.from" :min="1" class="!w-full" />
              </a-form-item>
              <a-form-item label="To rank" class="!mb-0">
                <a-input-number v-model:value="row.to" :min="row.from || 1" class="!w-full" />
              </a-form-item>
              <a-form-item label="Coin" class="!mb-0">
                <a-input-number v-model:value="row.coin" :min="0" class="!w-full" />
              </a-form-item>
              <a-form-item label="Star" class="!mb-0">
                <a-input-number v-model:value="row.star" :min="0" class="!w-full" />
              </a-form-item>
              <div class="flex items-end justify-end">
                <a-tooltip :title="form.rankRewards.length === 1 ? 'Cần ít nhất một khoảng rank' : formPermissionTooltip">
                  <span>
                    <a-button
                      danger
                      type="text"
                      class="admin-table-icon-btn"
                      title="Remove range"
                      :disabled="form.rankRewards.length === 1 || !canSaveCurrentQuest"
                      @click="removeRankReward(index)"
                    >
                      <i class="fa-solid fa-trash-can" aria-hidden="true" />
                    </a-button>
                  </span>
                </a-tooltip>
              </div>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
          <a-button @click="formOpen = false">Cancel</a-button>
          <a-tooltip :title="formPermissionTooltip">
            <span>
              <a-button type="primary" html-type="submit" :loading="saving" :disabled="!canSaveCurrentQuest">Save quest</a-button>
            </span>
          </a-tooltip>
        </div>
      </a-form>
    </AdminModal>

    <AdminModal v-model="detailOpen" title="Quest details" size="lg" @close="detailRecord = null">
      <div v-if="detailRecord" class="space-y-5">
        <div class="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 class="text-xl font-semibold text-slate-900">{{ detailRecord.title }}</h2>
            <p class="mt-1 text-sm text-slate-500">Max submissions: {{ detailRecord.max_submissions_per_user || 1 }}</p>
          </div>
          <a-tag :color="statusColor(detailRecord.status)">{{ detailRecord.status }}</a-tag>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-lg border border-slate-200 p-3">
            <div class="text-xs font-semibold uppercase text-slate-400">Submission window</div>
            <div class="mt-3 space-y-2 text-sm text-slate-700">
              <div class="grid grid-cols-[44px_1fr] gap-3">
                <span class="text-slate-400">Start</span>
                <span class="font-medium text-slate-900">{{ formatReadableDateTime(detailRecord.start_at) }}</span>
              </div>
              <div class="grid grid-cols-[44px_1fr] gap-3">
                <span class="text-slate-400">End</span>
                <span class="font-medium text-slate-900">{{ formatReadableDateTime(detailRecord.end_at) }}</span>
              </div>
            </div>
          </div>
          <div class="rounded-lg border border-slate-200 p-3">
            <div class="text-xs font-semibold uppercase text-slate-400">Judging window</div>
            <div class="mt-3 space-y-2 text-sm text-slate-700">
              <div class="grid grid-cols-[44px_1fr] gap-3">
                <span class="text-slate-400">Start</span>
                <span class="font-medium text-slate-900">{{ formatReadableDateTime(detailRecord.judging_start_at) }}</span>
              </div>
              <div class="grid grid-cols-[44px_1fr] gap-3">
                <span class="text-slate-400">End</span>
                <span class="font-medium text-slate-900">{{ formatReadableDateTime(detailRecord.judging_end_at) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <div class="rounded-lg bg-slate-50 p-3">
            <div class="text-xs font-semibold uppercase text-slate-400">Participation</div>
            <div class="mt-1 text-lg font-semibold text-slate-900">{{ detailRecord.reward_config?.participation?.star || 0 }} star</div>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <div class="text-xs font-semibold uppercase text-slate-400">Shortlist</div>
            <div class="mt-1 text-lg font-semibold text-slate-900">{{ detailRecord.reward_config?.shortlist?.star || 0 }} star</div>
          </div>
          <div class="rounded-lg bg-slate-50 p-3">
            <div class="text-xs font-semibold uppercase text-slate-400">Require license</div>
            <div class="mt-1 text-lg font-semibold text-slate-900">{{ detailRecord.require_license ? 'Yes' : 'No' }}</div>
          </div>
        </div>

        <div class="space-y-3">
          <div>
            <div class="text-sm font-semibold text-slate-900">Description</div>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-600">{{ detailRecord.description || '—' }}</p>
          </div>
          <div>
            <div class="text-sm font-semibold text-slate-900">Brief</div>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-600">{{ detailRecord.brief || '—' }}</p>
          </div>
          <div>
            <div class="text-sm font-semibold text-slate-900">Rules</div>
            <p class="mt-1 whitespace-pre-line text-sm text-slate-600">{{ detailRecord.rules || '—' }}</p>
          </div>
        </div>

        <div>
          <div class="mb-2 text-sm font-semibold text-slate-900">Rank rewards</div>
          <div class="overflow-hidden rounded-lg border border-slate-200">
            <div class="grid grid-cols-3 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
              <span>Rank</span>
              <span>Coin</span>
              <span>Star</span>
            </div>
            <div v-for="(rank, index) in detailRankRewards" :key="index" class="grid grid-cols-3 border-t border-slate-100 px-3 py-2 text-sm text-slate-700">
              <span>{{ rank.from }} - {{ rank.to }}</span>
              <span>{{ rank.rewards?.coin || 0 }}</span>
              <span>{{ rank.rewards?.star || 0 }}</span>
            </div>
          </div>
        </div>
      </div>
    </AdminModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { questsAdminApi } from '~/features/admin/quests/services/quests.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'
import { useAdminAuthStore } from '~/stores/adminAuthStore.js'

const questStatuses = ['draft', 'open', 'judging', 'completed']
const admin = useAdminAuthStore()
const defaultRanks = [
  { from: 1, to: 1, rewards: { coin: 1000, star: 100 } },
  { from: 2, to: 2, rewards: { coin: 700, star: 80 } },
  { from: 3, to: 3, rewards: { coin: 500, star: 60 } },
  { from: 4, to: 10, rewards: { coin: 200, star: 30 } },
  { from: 11, to: 20, rewards: { coin: 50, star: 10 } }
]

const filters = reactive({ status: undefined })
const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })
const formOpen = ref(false)
const detailOpen = ref(false)
const detailRecord = ref(null)
const editingId = ref(null)
const form = reactive(defaultForm())
const detailRankRewards = computed(() => detailRecord.value?.reward_config?.ranks || [])
const currentFormPermission = computed(() => (editingId.value ? 'UPDATE_QUEST' : 'CREATE_QUEST'))
const canSaveCurrentQuest = computed(() => admin.hasPermission(currentFormPermission.value))
const formPermissionTooltip = computed(() => admin.permissionTitle(currentFormPermission.value))

const columns = [
  { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true, width: 260 },
  { title: 'Status', key: 'status', width: 120 },
  { title: 'Window', key: 'window', width: 260 },
  { title: 'Max', dataIndex: 'max_submissions_per_user', key: 'max', width: 90 },
  { title: 'Rewards', key: 'reward', width: 260 },
  { title: '', key: 'action', width: 160, fixed: 'right' }
]

function defaultForm() {
  return {
    title: '',
    description: '',
    brief: '',
    rules: '',
    start_at: null,
    end_at: null,
    judging_start_at: null,
    judging_end_at: null,
    require_license: false,
    max_submissions_per_user: 1,
    participationStar: 5,
    shortlistStar: 20,
    rankRewards: cloneRankRewards(defaultRanks)
  }
}

function cloneRankRewards(ranks) {
  return (ranks || []).map((rank) => ({
    from: Number(rank.from || 1),
    to: Number(rank.to || rank.from || 1),
    coin: Number(rank.rewards?.coin || 0),
    star: Number(rank.rewards?.star || 0)
  }))
}

function resetForm() {
  Object.assign(form, defaultForm())
  editingId.value = null
}

async function fetchQuests() {
  loading.value = true
  try {
    const { data } = await questsAdminApi.quests({
      status: filters.status,
      page: pagination.current,
      size: pagination.pageSize
    })
    const page = data.quests
    rows.value = page.data || []
    pagination.total = page.total || 0
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load quests') })
  } finally {
    loading.value = false
  }
}

function onTableChange(p) {
  pagination.current = p.current
  pagination.pageSize = p.pageSize
  fetchQuests()
}

function openCreate() {
  if (!admin.hasPermission('CREATE_QUEST')) {
    notification.warning({ message: admin.permissionTitle('CREATE_QUEST') })
    return
  }
  resetForm()
  formOpen.value = true
}

function openEdit(record) {
  if (!canEditQuest(record)) {
    notification.warning({ message: editTooltip(record) })
    return
  }
  resetForm()
  editingId.value = record.id
  const config = record.reward_config || {}
  Object.assign(form, {
    title: record.title || '',
    description: record.description || '',
    brief: record.brief || '',
    rules: record.rules || '',
    start_at: record.start_at || null,
    end_at: record.end_at || null,
    judging_start_at: record.judging_start_at || null,
    judging_end_at: record.judging_end_at || null,
    require_license: !!record.require_license,
    max_submissions_per_user: record.max_submissions_per_user || 1,
    participationStar: config.participation?.star ?? 0,
    shortlistStar: config.shortlist?.star ?? 0,
    rankRewards: cloneRankRewards(config.ranks || defaultRanks)
  })
  formOpen.value = true
}

function openDetail(record) {
  detailRecord.value = record
  detailOpen.value = true
}

function addRankReward() {
  if (!canSaveCurrentQuest.value) {
    return
  }
  const last = form.rankRewards[form.rankRewards.length - 1]
  const from = last ? Number(last.to || last.from || 0) + 1 : 1
  form.rankRewards.push({ from, to: from, coin: 0, star: 0 })
}

function removeRankReward(index) {
  if (form.rankRewards.length <= 1) {
    return
  }
  form.rankRewards.splice(index, 1)
}

function buildRankRewardsPayload() {
  return form.rankRewards.map((row) => {
    const from = Number(row.from || 1)
    const to = Number(row.to || from)
    if (to < from) {
      throw new Error('Rank reward range is invalid')
    }
    return {
      from,
      to,
      rewards: {
        coin: Number(row.coin || 0),
        star: Number(row.star || 0)
      }
    }
  })
}

function parseDateValue(value) {
  if (!value) {
    return null
  }
  return new Date(String(value).replace(' ', 'T')).getTime()
}

function validateQuestTimes() {
  const startAt = parseDateValue(form.start_at)
  const endAt = parseDateValue(form.end_at)
  const judgingEndAt = parseDateValue(form.judging_end_at)
  const now = Date.now()

  if (!startAt || Number.isNaN(startAt)) {
    throw new Error('Start time is required')
  }
  if (!endAt || Number.isNaN(endAt)) {
    throw new Error('Submission end time is required')
  }
  if (!judgingEndAt || Number.isNaN(judgingEndAt)) {
    throw new Error('Judging end time is required')
  }
  if (startAt < now) {
    throw new Error('Start time cannot be in the past')
  }
  if (endAt <= startAt) {
    throw new Error('Submission end must be later than Start')
  }
  if (judgingEndAt <= endAt) {
    throw new Error('Judging end must be later than Submission end')
  }
}

function buildPayload() {
  validateQuestTimes()
  const ranks = buildRankRewardsPayload()
  if (!ranks.length) {
    throw new Error('Add at least one rank reward range')
  }
  return {
    title: form.title,
    description: form.description,
    brief: form.brief,
    rules: form.rules,
    start_at: form.start_at,
    end_at: form.end_at,
    judging_start_at: form.judging_start_at || form.end_at,
    judging_end_at: form.judging_end_at,
    require_license: form.require_license,
    max_submissions_per_user: form.max_submissions_per_user,
    reward_config: {
      participation: { star: form.participationStar || 0 },
      shortlist: { star: form.shortlistStar || 0 },
      ranks
    }
  }
}

async function submitForm() {
  if (!canSaveCurrentQuest.value) {
    notification.warning({ message: formPermissionTooltip.value })
    return
  }
  saving.value = true
  try {
    const payload = buildPayload()
    if (editingId.value) {
      await questsAdminApi.updateQuest(editingId.value, payload)
    } else {
      await questsAdminApi.createQuest(payload)
    }
    notification.success({ message: 'Quest saved' })
    formOpen.value = false
    await fetchQuests()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, error.message || 'Failed to save quest') })
  } finally {
    saving.value = false
  }
}

function canEditQuest(record) {
  return admin.hasPermission('UPDATE_QUEST') && record.status === 'draft'
}

function editTooltip(record) {
  if (!admin.hasPermission('UPDATE_QUEST')) {
    return admin.permissionTitle('UPDATE_QUEST')
  }
  if (record.status !== 'draft') {
    return 'Quest đã mở hoặc đã qua hạn nên không thể chỉnh sửa'
  }
  return ''
}

function rewardSummary(config) {
  const ranks = config?.ranks || []
  return ranks.length ? `${ranks.length} rank ranges` : 'No rank rewards'
}

function statusColor(status) {
  return { open: 'green', judging: 'blue', completed: 'gold', closed: 'volcano', draft: 'default' }[status] || 'default'
}

function formatDate(value) {
  if (!value) {
    return '—'
  }
  return String(value).replace('T', ' ').replace(/\.\d+Z?$/, '').replace(/Z$/, '')
}

function formatDatePart(value) {
  return formatDate(value).split(' ')[0] || '—'
}

function formatTimePart(value) {
  return formatDate(value).split(' ')[1]?.slice(0, 5) || '—'
}

function formatShortDateTime(value) {
  const date = formatDatePart(value)
  const time = formatTimePart(value)
  return date === '—' ? '—' : `${date} ${time}`
}

function formatReadableDateTime(value) {
  const date = formatDatePart(value)
  const time = formatTimePart(value)
  return date === '—' ? '—' : `${date} at ${time}`
}

onMounted(fetchQuests)
</script>
