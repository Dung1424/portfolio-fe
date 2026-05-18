<template>
  <div class="space-y-4">
    <a-card title="Store items">
      <div class="admin-toolbar">
        <a-select v-model:value="filters.type" allow-clear placeholder="Type" class="w-40" @change="fetchItems">
          <a-select-option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-button type="primary" class="!h-10 !rounded-lg !px-5 !font-semibold" @click="openCreate">
          <i class="fa-solid fa-plus mr-2" aria-hidden="true" />
          New item
        </a-button>
      </div>
      <a-spin :spinning="loading">
        <a-table :columns="columns" :data-source="rows" row-key="id" :pagination="pagination" :scroll="{ x: 880 }" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'active'">
              <a-tag :color="record.is_active ? 'green' : 'default'">{{ record.is_active ? 'active' : 'inactive' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="text" class="admin-table-icon-btn" title="Edit" @click="openEdit(record)">
                <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
              </a-button>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-card>

    <AdminModal v-model="formOpen" :title="editingId ? 'Edit item' : 'New item'" size="lg" @close="resetForm">
      <a-form layout="vertical" :model="form" @finish="saveItem">
        <a-form-item label="Name" name="name" :rules="[{ required: true, message: 'Enter item name' }]">
          <a-input v-model:value="form.name" size="large" />
        </a-form-item>
        <div class="grid gap-4 md:grid-cols-3">
          <a-form-item label="Type">
            <a-select v-model:value="form.type" size="large">
              <a-select-option v-for="t in itemTypes" :key="t" :value="t">{{ t }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="Coin cost">
            <a-input-number v-model:value="form.coin_cost" :min="0" class="!w-full" size="large" />
          </a-form-item>
          <a-form-item label="Stock">
            <a-input-number v-model:value="form.stock" :min="0" class="!w-full" size="large" />
          </a-form-item>
        </div>
        <a-form-item label="Active">
          <a-switch v-model:checked="form.is_active" />
        </a-form-item>
        <div class="flex justify-end gap-3">
          <a-button @click="formOpen = false">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="saving">Save item</a-button>
        </div>
      </a-form>
    </AdminModal>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { storeAdminApi } from '~/features/admin/store/services/store.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const itemTypes = ['in_app', 'discount', 'physical']
const filters = reactive({ type: undefined })
const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const formOpen = ref(false)
const editingId = ref(null)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })
const form = reactive(defaultForm())

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'Type', dataIndex: 'type', key: 'type', width: 140 },
  { title: 'Coin', dataIndex: 'coin_cost', key: 'coin_cost', width: 120 },
  { title: 'Stock', dataIndex: 'stock', key: 'stock', width: 120 },
  { title: 'Status', key: 'active', width: 120 },
  { title: '', key: 'action', width: 90, fixed: 'right' }
]

function defaultForm() {
  return { name: '', type: 'in_app', coin_cost: 0, stock: 0, is_active: true }
}

function resetForm() {
  Object.assign(form, defaultForm())
  editingId.value = null
}

async function fetchItems() {
  loading.value = true
  try {
    const { data } = await storeAdminApi.items({
      type: filters.type,
      page: pagination.current,
      size: pagination.pageSize
    })
    const page = data.items
    rows.value = page.data || []
    pagination.total = page.total || 0
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load store') })
  } finally {
    loading.value = false
  }
}

function onTableChange(p) {
  pagination.current = p.current
  pagination.pageSize = p.pageSize
  fetchItems()
}

function openCreate() {
  resetForm()
  formOpen.value = true
}

function openEdit(record) {
  resetForm()
  editingId.value = record.id
  Object.assign(form, {
    name: record.name,
    type: record.type,
    coin_cost: record.coin_cost,
    stock: record.stock,
    is_active: !!record.is_active
  })
  formOpen.value = true
}

async function saveItem() {
  saving.value = true
  try {
    if (editingId.value) {
      await storeAdminApi.updateItem(editingId.value, form)
    } else {
      await storeAdminApi.createItem(form)
    }
    notification.success({ message: 'Store item saved' })
    formOpen.value = false
    await fetchItems()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to save item') })
  } finally {
    saving.value = false
  }
}

onMounted(fetchItems)
</script>
