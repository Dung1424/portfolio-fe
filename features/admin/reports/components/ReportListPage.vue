<template>
  <div class="space-y-4">
    <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
      <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyFilters">
        <a-form-item label="Violator">
          <a-input v-model:value="filters.violator_name" allow-clear placeholder="Name" style="width: 140px" />
        </a-form-item>
        <a-form-item label="Reporter">
          <a-input v-model:value="filters.reporter_name" allow-clear placeholder="Name" style="width: 140px" />
        </a-form-item>
        <a-form-item label="Reason">
          <a-input v-model:value="filters.report_reason" allow-clear placeholder="Reason" style="width: 140px" />
        </a-form-item>
        <a-form-item label="Status">
          <a-select
            v-model:value="filters.status"
            allow-clear
            placeholder="Any"
            style="width: 130px"
            :options="[
              { value: 'pending', label: 'Pending' },
              { value: 'resolved', label: 'Resolved' }
            ]"
          />
        </a-form-item>
        <a-form-item label="Action taken">
          <a-select
            v-model:value="filters.action_taken"
            allow-clear
            placeholder="Any"
            style="width: 150px"
            :options="[
              { value: 'none', label: 'None' },
              { value: 'removed', label: 'Removed' },
              { value: 'no violation', label: 'No violation' }
            ]"
          />
        </a-form-item>
        <a-form-item label="From">
          <a-date-picker v-model:value="filters.start_date" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="To">
          <a-date-picker v-model:value="filters.end_date" value-format="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="button" @click="applyFilters">
            Apply
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card :title="title">
      <a-spin :spinning="loading">
        <a-table
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          :scroll="{ x: variant === 'photo' ? 1180 : 980 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'photo_thumb'">
              <div class="h-12 w-16 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <img
                  v-if="reportedPhotoImageUrl(record)"
                  :src="reportedPhotoImageUrl(record)"
                  :alt="record.photo?.title || 'Photo'"
                  class="h-full w-full object-cover"
                >
                <div v-else class="flex h-full w-full items-center justify-center text-[11px] text-slate-400">
                  —
                </div>
              </div>
            </template>
            <template v-else-if="column.key === 'photo_title'">
              <span class="font-medium text-slate-800">{{ record.photo?.title || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'report_reason'">
              <span class="text-slate-700">{{ record.report_reason || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'reporter'">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-800">
                  {{ record.reporter?.name || record.reporter_name || '—' }}
                </p>
                <p class="truncate text-xs text-slate-500">
                  {{ record.reporter?.username || '—' }}
                </p>
              </div>
            </template>
            <template v-else-if="column.key === 'violator'">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-slate-800">
                  {{ record.violator?.name || record.violator_name || '—' }}
                </p>
                <p class="truncate text-xs text-slate-500">
                  {{ record.violator?.username || '—' }}
                </p>
              </div>
            </template>
            <template v-else-if="column.key === 'status'">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset"
                :class="statusBadgeClass(record.status)"
              >
                {{ record.status || '—' }}
              </span>
            </template>
            <template v-else-if="column.key === 'action_taken'">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset"
                :class="actionTakenBadgeClass(record.action_taken)"
              >
                {{ record.action_taken || '—' }}
              </span>
            </template>
            <template v-else-if="column.key === 'report_date'">
              <span class="text-slate-700">{{ record.report_date || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'actions'">
              <a-space v-if="!isReportResolved(record)" size="small">
                <a-button
                  type="text"
                  danger
                  class="admin-table-icon-btn"
                  title="Removed"
                  @click="confirmResolve(record.id, 'removed')"
                >
                  <i class="fa-solid fa-trash-can text-base" aria-hidden="true" />
                </a-button>
                <a-button
                  type="text"
                  class="admin-table-icon-btn !text-emerald-600 hover:!text-emerald-700"
                  title="No violation"
                  @click="confirmResolve(record.id, 'no violation')"
                >
                  <i class="fa-solid fa-circle-check text-base" aria-hidden="true" />
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
        <AdminPager
          v-bind="pagerMeta"
          item-label="báo cáo"
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
import { notification } from 'ant-design-vue'
import { adminConfirm } from '~/composables/adminConfirm'
import { reportsAdminApi } from '~/features/admin/reports/services/reports.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultReportAdminListFilters,
  buildReportAdminListCursorQuery
} from '~/composables/adminCursorListPresets'

const props = defineProps({
  title: { type: String, required: true },
  /** (query) => Promise<axios response> */
  fetcher: { type: Function, required: true },
  /** `photo`: extra columns for reported photo (ListPhotos). */
  variant: {
    type: String,
    default: 'default',
    validator: (v) => v === 'default' || v === 'photo'
  },
  /** Key of the array inside unwrapped `data` (e.g. `reports`). */
  itemsKey: { type: String, default: 'reports' }
})

const { showFromError } = useApiErrorMessage()
const runtimeConfig = useRuntimeConfig()

const filters = ref(defaultReportAdminListFilters())

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
  itemsKey: props.itemsKey,
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildReportAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const { data } = await props.fetcher(q)
    return data
  }
})

const mediaBase = computed(() => String(runtimeConfig.public.apiBase || '').replace(/\/api(?:\/v\d+)?\/?$/i, ''))

const columns = computed(() => {
  const photoCols =
    props.variant === 'photo'
      ? [
          { title: 'Photo', key: 'photo_thumb', width: 90 },
          { title: 'Title', key: 'photo_title', ellipsis: true, width: 200 }
        ]
      : []
  return [
    ...photoCols,
    { title: 'Reason', key: 'report_reason', ellipsis: true, width: 180 },
    { title: 'Reporter', key: 'reporter', width: 150 },
    { title: 'Violator', key: 'violator', width: 150 },
    { title: 'Status', key: 'status', width: 110 },
    { title: 'Action', key: 'action_taken', width: 120 },
    { title: 'Reported', key: 'report_date', width: 170 },
    { title: 'Actions', key: 'actions', width: 100, fixed: 'right' }
  ]
})

function reportedPhotoImageUrl(record) {
  const path = record?.photo?.image_url || ''
  if (!path) {
    return ''
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  return `${mediaBase.value}${path.startsWith('/') ? '' : '/'}${path}`
}

function isReportResolved(record) {
  return String(record?.status || '').toLowerCase().trim() === 'resolved'
}

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'pending') {
    return 'bg-amber-50 text-amber-800 ring-amber-200/80'
  }
  if (s === 'resolved') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
  }
  if (s === 'dismissed' || s === 'rejected') {
    return 'bg-slate-100 text-slate-700 ring-slate-200/80'
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200/80'
}

function actionTakenBadgeClass(action) {
  const a = String(action || '').toLowerCase().trim()
  if (a === 'none' || a === '') {
    return 'bg-slate-100 text-slate-600 ring-slate-200/80'
  }
  if (a === 'removed') {
    return 'bg-rose-50 text-rose-800 ring-rose-200/80'
  }
  if (a === 'no violation') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
  }
  return 'bg-violet-50 text-violet-800 ring-violet-200/80'
}

async function confirmResolve(reportId, action) {
  const ok = await adminConfirm({
    title: `Mark report as "${action}"?`,
    content: 'This will update the report status.',
    okText: 'Confirm',
    cancelText: 'Cancel'
  })
  if (ok) {
    await resolveReport(reportId, action)
  }
}

async function resolveReport(reportId, action) {
  try {
    await reportsAdminApi.resolveReport(reportId, action)
    notification.success({
      message: 'Success',
      description: 'Report updated successfully.'
    })
    await fetchList(lastListPage.value)
  } catch (e) {
    showFromError(e)
  }
}

onMounted(() => fetchList(1))
</script>
