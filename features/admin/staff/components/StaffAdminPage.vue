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
              <div class="staff-action-group">
                <a-button type="text" class="staff-action-btn" title="Edit" @click="openEdit(record)">
                  <i class="fa-regular fa-pen-to-square" aria-hidden="true" />
                </a-button>
                <a-button type="text" class="staff-action-btn" title="Reset password" @click="openResetPassword(record)">
                  <i class="fa-solid fa-key" aria-hidden="true" />
                </a-button>
                <a-button type="text" class="staff-action-btn" title="Permissions" @click="openPermissions(record)">
                  <i class="fa-solid fa-user-shield" aria-hidden="true" />
                </a-button>
                <a-popconfirm
                  :title="record.is_active ? 'Lock this account?' : 'Unlock this account?'"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="toggleLock(record)"
                >
                  <a-button type="text" class="staff-action-btn" :title="record.is_active ? 'Lock account' : 'Unlock account'">
                    <i :class="record.is_active ? 'fa-solid fa-lock' : 'fa-solid fa-lock-open'" aria-hidden="true" />
                  </a-button>
                </a-popconfirm>
              </div>
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

    <AdminModal v-model="permissionOpen" title="User permissions" size="xl" @close="resetPermissionForm">
      <a-spin :spinning="loadingPermissions">
        <div class="space-y-4">
          <div class="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            Account: <strong>{{ permissionTarget?.email }}</strong>
          </div>
          <div class="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Only permissions from this account role are shown. Checked permissions are saved for this account.
          </div>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm text-slate-500">
              {{ selectedPermissionCodes.length }} / {{ permissions.length }} selected
            </div>
            <a-space>
              <a-button @click="selectAllPermissions">
                <i class="fa-solid fa-check-double mr-2" aria-hidden="true" />
                Select all
              </a-button>
              <a-button @click="clearAllPermissions">
                <i class="fa-solid fa-eraser mr-2" aria-hidden="true" />
                Clear all
              </a-button>
            </a-space>
          </div>
          <div class="space-y-5">
            <section
              v-for="group in groupedPermissions"
              :key="group.key"
              class="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 class="text-sm font-semibold text-slate-900">{{ group.label }}</h3>
                  <p class="mt-0.5 text-xs text-slate-500">{{ groupSelectedCount(group.items) }} / {{ group.items.length }} selected</p>
                </div>
                <a-space>
                  <a-button size="small" @click="selectGroupPermissions(group.items)">Select group</a-button>
                  <a-button size="small" @click="clearGroupPermissions(group.items)">Clear group</a-button>
                </a-space>
              </div>
              <div class="grid gap-3 md:grid-cols-2">
                <label
                  v-for="permission in group.items"
                  :key="permission.code"
                  class="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                >
                  <a-checkbox :checked="selectedPermissionCodes.includes(permission.code)" @change="togglePermission(permission.code, $event.target.checked)" />
                  <span>
                    <span class="block text-sm font-semibold text-slate-900">{{ permission.name }}</span>
                    <span class="mt-1 block text-xs text-slate-500">{{ permission.description }}</span>
                  </span>
                </label>
              </div>
            </section>
          </div>
          <div class="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <a-button @click="permissionOpen = false">Cancel</a-button>
            <a-button type="primary" :loading="savingPermissions" @click="savePermissions">Save permissions</a-button>
          </div>
        </div>
      </a-spin>
    </AdminModal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { notification } from 'ant-design-vue'
import { staffAdminApi } from '~/features/admin/staff/services/staff.api.js'
import { getErrorMessage } from '~/services/apiEnvelope.js'

const staffRoles = ['editor', 'jury']
const filters = reactive({ q: '', role: undefined, status: undefined })
const rows = ref([])
const loading = ref(false)
const saving = ref(false)
const savingPassword = ref(false)
const loadingPermissions = ref(false)
const savingPermissions = ref(false)
const formOpen = ref(false)
const passwordOpen = ref(false)
const permissionOpen = ref(false)
const editingId = ref(null)
const passwordTarget = ref(null)
const permissionTarget = ref(null)
const permissions = ref([])
const selectedPermissionCodes = ref([])
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

const permissionGroups = [
  { key: 'dashboard', label: 'Dashboard', prefixes: ['VIEW_DASHBOARD', 'VIEW_STATISTICS'] },
  { key: 'photos', label: 'Photos', prefixes: ['PHOTO', 'APPROVE_PHOTO', 'REJECT_PHOTO'] },
  { key: 'catalog', label: 'Catalog', prefixes: ['CATEGORY', 'TAG'] },
  { key: 'quests', label: 'Quests & Store', prefixes: ['QUEST', 'STORE', 'REDEMPTION'] },
  { key: 'reports', label: 'Reports', prefixes: ['REPORT'] },
  { key: 'users', label: 'Users & Staff', prefixes: ['USER', 'STAFF'] },
  { key: 'content', label: 'Content', prefixes: ['CONTACT', 'BLOG'] },
  { key: 'account', label: 'Account', prefixes: ['ADMIN_PROFILE', 'ADMIN_PASSWORD'] },
  { key: 'other', label: 'Other', prefixes: [] }
]

const groupedPermissions = computed(() => {
  const groups = permissionGroups.map(group => ({ ...group, items: [] }))
  for (const permission of permissions.value) {
    const group = groups.find(item => item.prefixes.some(prefix => permission.code.includes(prefix))) || groups[groups.length - 1]
    group.items.push(permission)
  }
  return groups.filter(group => group.items.length)
})

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

function resetPermissionForm() {
  permissionTarget.value = null
  selectedPermissionCodes.value = []
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

async function openPermissions(record) {
  resetPermissionForm()
  permissionTarget.value = record
  permissionOpen.value = true
  loadingPermissions.value = true
  try {
    const [allResponse, userResponse] = await Promise.all([
      staffAdminApi.permissions(),
      staffAdminApi.userPermissions(record.id)
    ])
    const rolePermissionCodes = userResponse.data.role_permissions || []
    const effectivePermissionCodes = userResponse.data.effective_permissions || []
    permissions.value = (allResponse.data.permissions || [])
      .filter(permission => rolePermissionCodes.includes(permission.code))
    selectedPermissionCodes.value = effectivePermissionCodes
      .filter(code => rolePermissionCodes.includes(code))
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to load permissions') })
  } finally {
    loadingPermissions.value = false
  }
}

function togglePermission(code, checked) {
  if (checked && !selectedPermissionCodes.value.includes(code)) {
    selectedPermissionCodes.value = [...selectedPermissionCodes.value, code]
    return
  }
  if (!checked) {
    selectedPermissionCodes.value = selectedPermissionCodes.value.filter(item => item !== code)
  }
}

function selectAllPermissions() {
  selectedPermissionCodes.value = permissions.value.map(permission => permission.code)
}

function clearAllPermissions() {
  selectedPermissionCodes.value = []
}

function selectGroupPermissions(items) {
  const codes = items.map(permission => permission.code)
  selectedPermissionCodes.value = Array.from(new Set([...selectedPermissionCodes.value, ...codes]))
}

function clearGroupPermissions(items) {
  const codes = new Set(items.map(permission => permission.code))
  selectedPermissionCodes.value = selectedPermissionCodes.value.filter(code => !codes.has(code))
}

function groupSelectedCount(items) {
  const codes = new Set(items.map(permission => permission.code))
  return selectedPermissionCodes.value.filter(code => codes.has(code)).length
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

async function savePermissions() {
  if (!permissionTarget.value) {
    return
  }
  savingPermissions.value = true
  try {
    await staffAdminApi.syncUserPermissions(permissionTarget.value.id, selectedPermissionCodes.value)
    notification.success({ message: 'Permissions saved' })
    permissionOpen.value = false
  } catch (error) {
    notification.error({ message: getErrorMessage(error, 'Failed to save permissions') })
  } finally {
    savingPermissions.value = false
  }
}

onMounted(fetchStaff)
</script>

<style scoped>
.staff-action-group {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 0.04);
}

.staff-action-btn.ant-btn {
  display: inline-flex;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  color: #64748b;
  background: transparent;
  transition: background-color 0.15s ease, color 0.15s ease, transform 0.15s ease;
}

.staff-action-btn.ant-btn:hover,
.staff-action-btn.ant-btn:focus-visible {
  color: #2563eb;
  background: #eff6ff;
}

.staff-action-btn.ant-btn:active {
  transform: translateY(1px);
}

.staff-action-btn i {
  font-size: 13px;
  line-height: 1;
}
</style>
