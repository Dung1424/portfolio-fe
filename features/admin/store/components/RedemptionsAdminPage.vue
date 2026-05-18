<template>
  <a-card title="Redemptions">
    <div class="admin-toolbar">
      <a-select v-model:value="filters.status" allow-clear placeholder="Status" class="w-44" @change="fetchRows">
        <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
      </a-select>
      <a-button @click="fetchRows">Refresh</a-button>
    </div>
    <a-spin :spinning="loading">
      <a-table :columns="columns" :data-source="rows" row-key="id" :pagination="pagination" :scroll="{ x: 960 }" @change="onTableChange">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            {{ record.user?.username || record.user?.email || record.user_id }}
          </template>
          <template v-else-if="column.key === 'item'">
            {{ record.store_item?.name || record.storeItem?.name || record.store_item_id }}
          </template>
          <template v-else-if="column.key === 'status'">
            <a-select :value="record.status" class="w-36" @change="status => updateStatus(record, status)">
              <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
            </a-select>
          </template>
        </template>
      </a-table>
    </a-spin>
  </a-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { storeAdminApi } from '~/features/admin/store/services/store.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const statuses = ['pending', 'completed', 'failed']
const filters = reactive({ status: undefined })
const rows = ref([])
const loading = ref(false)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })
const columns = [
  { title: 'User', key: 'user', width: 220 },
  { title: 'Item', key: 'item', width: 260 },
  { title: 'Coin spent', dataIndex: 'coin_spent', key: 'coin_spent', width: 130 },
  { title: 'Status', key: 'status', width: 170 },
  { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 190 }
]

async function fetchRows() {
  loading.value = true
  try {
    const { data } = await storeAdminApi.redemptions({
      status: filters.status,
      page: pagination.current,
      size: pagination.pageSize
    })
    const page = data.redemptions
    rows.value = page.data || []
    pagination.total = page.total || 0
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load redemptions') })
  } finally {
    loading.value = false
  }
}

function onTableChange(p) {
  pagination.current = p.current
  pagination.pageSize = p.pageSize
  fetchRows()
}

async function updateStatus(record, status) {
  try {
    await storeAdminApi.updateRedemptionStatus(record.id, status)
    notification.success({ message: 'Redemption updated' })
    await fetchRows()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to update redemption') })
  }
}

onMounted(fetchRows)
</script>
