<template>
  <div class="space-y-4">
    <a-card title="Staff accounts">
      <div class="admin-toolbar">
        <a-input-search v-model:value="filters.q" allow-clear placeholder="Search name, username, email" class="w-72" @search="fetchStaff" />
        <a-select v-model:value="filters.role" allow-clear placeholder="Role" class="w-36" @change="fetchStaff">
          <a-select-option v-for="role in staffRoles" :key="role" :value="role">{{ role }}</a-select-option>
        </a-select>
        <a-select v-model:value="filters.status" allow-clear placeholder="Status" class="w-36" @change="fetchStaff">
          <a-select-option value="active">active</a-select-option>
          <a-select-option value="locked">locked</a-select-option>
        </a-select>
        <a-button type="primary" class="!h-10 !rounded-lg !px-5 !font-semibold" @click="openCreate">
          <i class="fa-solid fa-user-plus mr-2" aria-hidden="true" />
          New staff
        </a-button>
      </div>

      <a-spin :spinning="loading">
        <a-table :columns="columns" :data-source="rows" row-key="id" :pagination="pagination" :scroll="{ x: 980 }" @change="onTableChange">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'identity'">
              <div>
                <div class="font-semibold text-slate-900">{{ record.name || record.username }}</div>
                <div class="text-xs text-slate-500">@{{ record.username }}</div>
              </div>
            </template>
            <template v-else-if="column.key === 'role'">
              <a-tag :color="record.role?.roleName === 'editor' ? 'blue' : 'purple'">{{ record.role?.roleName || '—' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'status'">
              <a-tag :color="record.is_active ? 'green' : 'red'">{{ record.is_active ? 'active' : 'locked' }}</a-tag>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-space size="small">
                <a-button type="text" class="admin-table-icon-btn" title="Edit" @click="openEdit(record)">
                  <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
                </a-button>
                <a-button type="text" class="admin-table-icon-btn" title="Reset password" @click="openResetPassword(record)">
                  <i class="fa-solid fa-key" aria-hidden="true" />
                </a-button>
                <a-popconfirm
                  :title="record.is_active ? 'Lock this account?' : 'Unlock this account?'"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="toggleLock(record)"
                >
                  <a-button type="text" class="admin-table-icon-btn" :title="record.is_active ? 'Lock account' : 'Unlock account'">
                    <i :class="record.is_active ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'" aria-hidden="true" />
                  </a-button>
                </a-popconfirm>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-spin>
    </a-card>

    <AdminModal v-model="formOpen" :title="editingId ? 'Edit staff account' : 'New staff account'" size="lg" @close="resetForm">
      <a-form layout="vertical" :model="form" @finish="saveStaff">
        <div class="grid gap-4 md:grid-cols-2">
          <a-form-item label="Username" name="username" :rules="[{ required: true, message: 'Enter username' }]">
            <a-input v-model:value="form.username" size="large" />
          </a-form-item>
          <a-form-item label="Name">
            <a-input v-model:value="form.name" size="large" />
          </a-form-item>
        </div>
        <div class="grid gap-4 md:grid-cols-2">
          <a-form-item label="Email" name="email" :rules="[{ required: true, type: 'email', message: 'Enter valid email' }]">
            <a-input v-model:value="form.email" size="large" />
          </a-form-item>
          <a-form-item label="Role">
            <a-select v-model:value="form.role" size="large">
              <a-select-option v-for="role in staffRoles" :key="role" :value="role">{{ role }}</a-select-option>
            </a-select>
          </a-form-item>
        </div>
        <a-form-item v-if="!editingId" label="Password" name="password" :rules="[{ required: true, message: 'Enter password' }]">
          <a-input-password v-model:value="form.password" size="large" />
        </a-form-item>
        <a-form-item label="Active">
          <a-switch v-model:checked="form.is_active" />
        </a-form-item>
        <div class="flex justify-end gap-3">
          <a-button @click="formOpen = false">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="saving">Save account</a-button>
        </div>
      </a-form>
    </AdminModal>

    <AdminModal v-model="passwordOpen" title="Reset password" size="sm" @close="resetPasswordForm">
      <a-form layout="vertical" :model="passwordForm" @finish="savePassword">
        <div class="mb-4 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Account: <strong>{{ passwordTarget?.email }}</strong>
        </div>
        <a-form-item label="New password" name="password" :rules="[{ required: true, message: 'Enter new password' }]">
          <a-input-password v-model:value="passwordForm.password" size="large" />
        </a-form-item>
        <div class="flex justify-end gap-3">
          <a-button @click="passwordOpen = false">Cancel</a-button>
          <a-button type="primary" html-type="submit" :loading="savingPassword">Reset password</a-button>
        </div>
      </a-form>
    </AdminModal>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { staffAdminApi } from '~/features/admin/staff/services/staff.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const staffRoles = ['editor', 'jury']
const filters = reactive({ q: '', role: undefined, status: undefined })
const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const savingPassword = ref(false)
const formOpen = ref(false)
const passwordOpen = ref(false)
const editingId = ref(null)
const passwordTarget = ref(null)
const pagination = reactive({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })
const form = reactive(defaultForm())
const passwordForm = reactive({ password: '' })

const columns = [
  { title: 'Account', key: 'identity', width: 230 },
  { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true, width: 260 },
  { title: 'Role', key: 'role', width: 130 },
  { title: 'Status', key: 'status', width: 120 },
  { title: 'Joined', dataIndex: 'join_date', key: 'join_date', width: 180 },
  { title: '', key: 'action', width: 160, fixed: 'right' }
]

function defaultForm() {
  return {
    username: '',
    name: '',
    email: '',
    role: 'editor',
    password: '',
    is_active: true
  }
}

function resetForm() {
  Object.assign(form, defaultForm())
  editingId.value = null
}

function resetPasswordForm() {
  passwordTarget.value = null
  passwordForm.password = ''
}

async function fetchStaff() {
  loading.value = true
  try {
    const { data } = await staffAdminApi.staff({
      q: filters.q || undefined,
      role: filters.role,
      status: filters.status,
      page: pagination.current,
      size: pagination.pageSize
    })
    const page = data.staff
    rows.value = page.data || []
    pagination.total = page.total || 0
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load staff accounts') })
  } finally {
    loading.value = false
  }
}

function onTableChange(p) {
  pagination.current = p.current
  pagination.pageSize = p.pageSize
  fetchStaff()
}

function openCreate() {
  resetForm()
  formOpen.value = true
}

function openEdit(record) {
  resetForm()
  editingId.value = record.id
  Object.assign(form, {
    username: record.username || '',
    name: record.name || '',
    email: record.email || '',
    role: record.role?.roleName || 'editor',
    password: '',
    is_active: !!record.is_active
  })
  formOpen.value = true
}

function openResetPassword(record) {
  resetPasswordForm()
  passwordTarget.value = record
  passwordOpen.value = true
}

function buildPayload() {
  const payload = {
    username: form.username,
    name: form.name,
    email: form.email,
    role: form.role,
    is_active: form.is_active
  }
  if (!editingId.value) {
    payload.password = form.password
  }
  return payload
}

async function saveStaff() {
  saving.value = true
  try {
    if (editingId.value) {
      await staffAdminApi.updateStaff(editingId.value, buildPayload())
    } else {
      await staffAdminApi.createStaff(buildPayload())
    }
    notification.success({ message: 'Staff account saved' })
    formOpen.value = false
    await fetchStaff()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to save staff account') })
  } finally {
    saving.value = false
  }
}

async function savePassword() {
  if (!passwordTarget.value) {
    return
  }
  savingPassword.value = true
  try {
    await staffAdminApi.resetPassword(passwordTarget.value.id, passwordForm.password)
    notification.success({ message: 'Password reset' })
    passwordOpen.value = false
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to reset password') })
  } finally {
    savingPassword.value = false
  }
}

async function toggleLock(record) {
  try {
    if (record.is_active) {
      await staffAdminApi.lockStaff(record.id)
      notification.success({ message: 'Account locked' })
    } else {
      await staffAdminApi.unlockStaff(record.id)
      notification.success({ message: 'Account unlocked' })
    }
    await fetchStaff()
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to update account status') })
  }
}

onMounted(fetchStaff)
</script>
