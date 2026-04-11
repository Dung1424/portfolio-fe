<template>
  <div class="space-y-4">
    <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
      <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyFilters">
        <a-form-item label="Name">
          <a-input v-model:value="filters.name" allow-clear placeholder="Name" style="width: 140px" />
        </a-form-item>
        <a-form-item label="Email">
          <a-input v-model:value="filters.email" allow-clear placeholder="Email" style="width: 180px" />
        </a-form-item>
        <a-form-item label="Subject">
          <a-input v-model:value="filters.subject" allow-clear placeholder="Subject" style="width: 160px" />
        </a-form-item>
        <a-form-item label="Message">
          <a-input v-model:value="filters.message" allow-clear placeholder="Message" style="width: 160px" />
        </a-form-item>
        <a-form-item label="Status">
          <a-select
            v-model:value="filters.status"
            allow-clear
            placeholder="Any"
            style="width: 140px"
            :options="[
              { value: 'pending', label: 'Pending' },
              { value: 'processed', label: 'Processed' }
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

    <a-card title="Contact inbox">
      <a-spin :spinning="loading">
        <a-table
          :columns="columns"
          :data-source="rows"
          :pagination="false"
          :scroll="{ x: 900 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'status'">
              <span
                class="inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset"
                :class="statusBadgeClass(record.status)"
              >
                {{ record.status || '—' }}
              </span>
            </template>
            <template v-else-if="column.key === 'contact_date'">
              <span class="text-slate-700">{{ record.contact_date || '—' }}</span>
            </template>
            <template v-else-if="column.key === 'action'">
              <a-button type="text" class="admin-table-icon-btn" title="Reply" @click="openReplyModal(record)">
                <i class="fa-solid fa-envelope-open" aria-hidden="true" />
              </a-button>
            </template>
          </template>
        </a-table>
        <AdminPager
          v-bind="pagerMeta"
          item-label="liên hệ"
          :loading="loading"
          @update:page="fetchList"
          @update:page-size="onPageSize"
        />
      </a-spin>
    </a-card>

    <AdminModal
      v-model="replyOpen"
      :title="replyModalTitle"
      size="contact"
      @close="closeReplyModal"
    >
      <div class="mt-1 space-y-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
        <div>
          <label class="mb-2 block text-sm font-medium text-portfolio-ink" for="contact-reply-message">
            Message
          </label>
          <a-textarea
            id="contact-reply-message"
            v-model:value="replyBody"
            :rows="5"
            placeholder="Nội dung phản hồi (gửi lên API dưới dạng message)…"
          />
        </div>
        <a-button type="primary" size="large" :loading="sending" @click="sendReply">
          Gửi phản hồi
        </a-button>
      </div>
    </AdminModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from '#app'
import { notification } from 'ant-design-vue'
import { contactsAdminApi } from '~/features/admin/contacts/services/contacts.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { useAdminCursorList } from '~/composables/useAdminCursorList'
import {
  defaultContactAdminListFilters,
  buildContactAdminListCursorQuery
} from '~/composables/adminCursorListPresets'

const { showFromError } = useApiErrorMessage()

const route = useRoute()
const router = useRouter()

const filters = ref(defaultContactAdminListFilters())

const {
  loading,
  rows,
  pagerMeta,
  fetchList,
  applyFilters,
  onPageSize
} = useAdminCursorList({
  filters,
  itemsKey: 'contacts',
  initialPageSize: 20,
  buildQuery: ({ page, pageSize, cursors, filters: f }) =>
    buildContactAdminListCursorQuery(f, { page, pageSize, cursors }),
  fetch: async (q) => {
    const { data } = await contactsAdminApi.contacts(q)
    return data
  }
})

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true, width: 140 },
  { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true, width: 200 },
  { title: 'Subject', dataIndex: 'subject', key: 'subject', ellipsis: true },
  { title: 'Status', key: 'status', width: 120 },
  { title: 'Date', key: 'contact_date', width: 170 },
  { title: '', key: 'action', width: 56, fixed: 'right' }
]

const replyOpen = ref(false)
const replyTargetId = ref(null)
/** Optional context from list row (no Detail API). */
const replyContext = ref(null)
const replyBody = ref('')
const sending = ref(false)

const replyModalTitle = computed(() => {
  const ctx = replyContext.value
  if (ctx?.email) {
    return `Trả lời · ${ctx.email}`
  }
  return 'Trả lời liên hệ'
})

function statusBadgeClass(status) {
  const s = String(status || '').toLowerCase().trim()
  if (s === 'pending') {
    return 'bg-amber-50 text-amber-800 ring-amber-200/80'
  }
  if (s === 'processed' || s === 'resolved' || s === 'replied') {
    return 'bg-emerald-50 text-emerald-800 ring-emerald-200/80'
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200/80'
}

function openReplyModal(record) {
  replyTargetId.value = record?.id != null ? String(record.id) : null
  replyContext.value = record
    ? {
        email: record.email,
        name: record.name,
        subject: record.subject
      }
    : null
  replyBody.value = ''
  replyOpen.value = true
}

function openReplyModalById(id) {
  replyTargetId.value = String(id)
  replyContext.value = null
  replyBody.value = ''
  replyOpen.value = true
}

function closeReplyModal() {
  replyOpen.value = false
  replyTargetId.value = null
  replyContext.value = null
  replyBody.value = ''
}

async function sendReply() {
  const id = replyTargetId.value
  if (!id) {
    return
  }
  const message = String(replyBody.value || '').trim()
  if (!message) {
    notification.warning({
      message: 'Thiếu nội dung',
      description: 'Vui lòng nhập message trước khi gửi.'
    })
    return
  }
  sending.value = true
  try {
    await contactsAdminApi.replyContact(id, { message })
    notification.success({
      message: 'Thành công',
      description: 'Đã gửi phản hồi.'
    })
    closeReplyModal()
    await fetchList(pagerMeta.value.page)
  } catch (e) {
    showFromError(e)
  } finally {
    sending.value = false
  }
}

function consumeContactQuery() {
  const q = route.query.contact
  if (q != null && q !== '') {
    openReplyModalById(String(q))
    router.replace({ path: '/admin/contacts', query: {} })
  }
}

watch(() => route.query.contact, consumeContactQuery, { immediate: true })

onMounted(() => fetchList(1))
</script>
