<template>
  <div class="space-y-4">
    <a-card title="Quest submissions">
      <div class="admin-toolbar">
        <a-input v-model:value="filters.quest_id" allow-clear placeholder="Quest UUID" class="max-w-[320px]" @press-enter="fetchRows" />
        <a-select v-model:value="filters.status" allow-clear placeholder="Status" class="w-44" @change="fetchRows">
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-button @click="fetchRows">Refresh</a-button>
      </div>
      <a-spin :spinning="loading">
        <a-table :columns="columns" :data-source="rows" row-key="id" :pagination="pagination" :scroll="{ x: 1180 }" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'image'">
              <a :href="record.image_url" target="_blank" rel="noreferrer" class="block h-14 w-20 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <img :src="record.image_url" :alt="record.title || 'Submission'" class="h-full w-full object-cover">
              </a>
            </template>
            <template v-else-if="column.key === 'quest'">
              <div class="max-w-[220px] truncate font-medium text-slate-800">{{ record.quest?.title || record.quest_id }}</div>
              <div class="font-mono text-[11px] text-slate-400">{{ record.quest_id }}</div>
            </template>
            <template v-else-if="column.key === 'user'">
              <div>{{ record.user?.username || record.user?.email || record.user_id }}</div>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="statusColor(record.status)">{{ record.status }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space size="small">
                <a-button type="text" class="admin-table-icon-btn" title="Approve" :disabled="record.status !== 'pending'" @click="moderate(record, 'approve')">
                  <i class="fa-solid fa-check" aria-hidden="true" />
                </a-button>
                <a-button type="text" class="admin-table-icon-btn" title="Shortlist" :disabled="record.status !== 'approved'" @click="moderate(record, 'shortlist')">
                  <i class="fa-solid fa-star" aria-hidden="true" />
                </a-button>
                <a-button type="text" danger class="admin-table-icon-btn" title="Reject" :disabled="!['pending', 'approved'].includes(record.status)" @click="moderate(record, 'reject')">
                  <i class="fa-solid fa-xmark" aria-hidden="true" />
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { editorSubmissionsApi } from '~/features/editor/services/submissions.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const statuses = ['pending', 'approved', 'rejected', 'shortlisted', 'winner']
const filters = reactive({ quest_id: '', status: undefined })
const rows = ref([])
const loading = ref(false)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const columns = [
  { title: 'Image', key: 'image', width: 100 },
  { title: 'Title', dataIndex: 'title', key: 'title', ellipsis: true, width: 180 },
  { title: 'Quest', key: 'quest', width: 260 },
  { title: 'User', key: 'user', width: 180 },
  { title: 'Status', key: 'status', width: 130 },
  { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 180 },
  { title: '', key: 'action', width: 150, fixed: 'right' }
]

async function fetchRows() {
  loading.value = true
  try {
    const { data } = await editorSubmissionsApi.submissions({
      quest_id: filters.quest_id || undefined,
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

function onTableChange(p) {
  pagination.current = p.current
  pagination.pageSize = p.pageSize
  fetchRows()
}

async function moderate(record, action) {
  try {
    if (action === 'approve') {
      await editorSubmissionsApi.approveSubmission(record.id)
    } else if (action === 'shortlist') {
      await editorSubmissionsApi.shortlistSubmission(record.id)
    } else {
      await editorSubmissionsApi.rejectSubmission(record.id)
    }
    notification.success({ message: 'Submission updated' })
    await fetchRows()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to update submission') })
  }
}

function statusColor(status) {
  return { approved: 'green', shortlisted: 'blue', winner: 'gold', rejected: 'red', pending: 'default' }[status] || 'default'
}

onMounted(fetchRows)
</script>
