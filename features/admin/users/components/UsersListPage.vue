<template>
  <div class="space-y-4">
    <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
      <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyFilters">
        <a-form-item label="Username">
          <a-input v-model:value="filters.username" allow-clear placeholder="Username" style="width: 140px" />
        </a-form-item>
        <a-form-item label="Email">
          <a-input v-model:value="filters.email" allow-clear placeholder="Email" style="width: 180px" />
        </a-form-item>
        <a-form-item label="Name">
          <a-input v-model:value="filters.name" allow-clear placeholder="Name" style="width: 140px" />
        </a-form-item>
        <a-form-item label="Violations ≥">
          <a-input-number
            v-model:value="filters.violation_count"
            :min="0"
            placeholder="Any"
            class="!w-[120px]"
          />
        </a-form-item>
        <a-form-item label="Join from">
          <a-date-picker v-model:value="filters.start_date" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="Join to">
          <a-date-picker v-model:value="filters.end_date" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="button" @click="applyFilters">
            Apply
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="Active users">
      <a-spin :spinning="loading">
        <a-table
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          :scroll="{ x: 1280 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'avatar'">
              <div class="flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
                <img
                  v-if="userAvatarUrl(record)"
                  :src="userAvatarUrl(record)"
                  :alt="record.username || 'User'"
                  class="h-full w-full object-cover"
                >
                <div
                  v-else
                  class="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500"
                >
                  {{ userInitial(record) }}
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'bio'">
              <p class="max-w-[240px] truncate text-sm text-slate-600" :title="record.bio || ''">
                {{ record.bio || '—' }}
              </p>
            </template>
            <template v-else-if="column.key === 'location'">
              <span class="text-slate-700">{{ record.location || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <NuxtLink
                :to="`/admin/users/${record.id}`"
                class="admin-table-link-icon"
                title="View user"
              >
                <i class="fa-solid fa-eye" aria-hidden="true" />
              </NuxtLink>
            </template>
          </template>
        </a-table>
        <AdminPager
          v-bind="pagerMeta"
          item-label="người dùng"
          :loading="loading"
          @update:page="fetchList"
          @update:page-size="onPageSize"
        />
      </a-spin>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usersAdminApi } from '~/features/admin/users/services/users.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultUserAdminListFilters,
  buildUserAdminListCursorQuery
} from '~/composables/adminCursorListPresets'

const { showFromError } = useApiErrorMessage()
const runtimeConfig = useRuntimeConfig()

const filters = ref(defaultUserAdminListFilters())

const mediaBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, ''))

const {
  loading,
  rows,
  pagerMeta,
  lastListPage,
  fetchList,
  applyFilters,
  onPageSize
} = useAdminCursorList({
  filters,
  itemsKey: 'users',
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildUserAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const { data } = await usersAdminApi.users(q)
    return data
  }
})

const columns = [
  { title: '', key: 'avatar', width: 72 },
  { title: 'Username', dataIndex: 'username', key: 'username', width: 140 },
  { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true, width: 150 },
  { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true, width: 200 },
  { title: 'Bio', key: 'bio', ellipsis: true, width: 240 },
  { title: 'Location', key: 'location', ellipsis: true, width: 170 },
  { title: 'Photos', dataIndex: 'photos_count', key: 'photos_count', width: 88 },
  { title: 'Violations', dataIndex: 'violation_count', key: 'violation_count', width: 100 },
  { title: '', key: 'action', width: 56, fixed: 'right' }
]

function userAvatarUrl(record) {
  const path = record?.profile_picture || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
}

function userInitial(record) {
  const base = String(record?.name || record?.username || '?').trim()
  return base ? base.charAt(0).toUpperCase() : '?'
}

onMounted(() => fetchList(1))
</script>
