<template>
  <div class="space-y-4">
    <a-card title="Filters" size="small" class="[&_.ant-card-head]:!min-h-[44px] [&_.ant-card-body]:!py-4">
      <a-form layout="inline" class="flex flex-wrap gap-2" @submit.prevent="applyFilters">
        <a-form-item label="Tag name">
          <a-input v-model:value="filters.tag_name" allow-clear placeholder="Tag name" style="width: 200px" />
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="button" @click="applyFilters">
            Apply
          </a-button>
        </a-form-item>
      </a-form>
    </a-card>

    <a-card title="Tags">
    <div class="admin-toolbar">
      <a-button type="primary" size="large" class="!h-10 !rounded-lg !px-5 !font-semibold" @click="openCreate">
        <i class="fa-solid fa-plus mr-2 opacity-90" aria-hidden="true" />
        Add tag
      </a-button>
    </div>
    <a-spin :spinning="loading">
      <a-table
        :columns="columns"
        :data-source="rows"
        :pagination="false"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'action'">
            <a-space size="small">
              <a-button type="text" class="admin-table-icon-btn" title="Edit" @click="openEdit(record)">
                <i class="fa-solid fa-pen-to-square" aria-hidden="true" />
              </a-button>
              <a-button type="text" danger class="admin-table-icon-btn" title="Delete" @click="confirmDelete(record)">
                <i class="fa-solid fa-trash-can" aria-hidden="true" />
              </a-button>
            </a-space>
          </template>
        </template>
      </a-table>
      <AdminPager
        v-bind="pagerMeta"
        item-label="tag"
        :loading="loading"
        @update:page="load"
        @update:page-size="onPageSize"
      />
    </a-spin>

    <AdminModal
      v-model="createOpen"
      title="Add tag"
      size="lg"
      @close="resetCreate"
    >
      <a-form layout="vertical" class="mt-1" :model="createForm" @finish="submitCreate">
        <a-form-item
          label="Name"
          name="tag_name"
          :rules="[
            { required: true, message: 'Please enter a tag name' },
            { max: 50, message: 'Max 50 characters' }
          ]"
        >
          <a-input v-model:value="createForm.tag_name" size="large" :maxlength="50" show-count placeholder="Tag name" />
        </a-form-item>
        <a-form-item class="!mb-0">
          <a-button type="primary" html-type="submit" size="large" :loading="createLoading">
            Create tag
          </a-button>
        </a-form-item>
      </a-form>
    </AdminModal>

    <AdminModal
      v-model="editOpen"
      title="Edit tag"
      size="lg"
      @close="resetEdit"
    >
      <a-form v-if="editingId" layout="vertical" class="mt-1" :model="editForm" @finish="submitEdit">
        <a-form-item
          label="Name"
          name="tag_name"
          :rules="[
            { required: true, message: 'Please enter a tag name' },
            { max: 50, message: 'Max 50 characters' }
          ]"
        >
          <a-input v-model:value="editForm.tag_name" size="large" :maxlength="50" show-count />
        </a-form-item>
        <a-form-item class="!mb-0">
          <a-button type="primary" html-type="submit" size="large" :loading="editLoading">
            Save changes
          </a-button>
        </a-form-item>
      </a-form>
    </AdminModal>
    </a-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { notification } from 'ant-design-vue'
import { adminConfirm } from '~/composables/adminConfirm'
import { tagsAdminApi, tagsTablePayloadFromAdminBody } from '~/features/admin/tags/services/tags.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'
import { laravelPageMeta } from '~/composables/adminPagerMeta'

const { showFromError } = useApiErrorMessage()

const filters = ref({
  tag_name: ''
})

const loading = ref(false)
const payload = ref(null)
const lastListPage = ref(1)

const rows = computed(() => payload.value?.data ?? [])

const pageSize = ref(10)
const pagerMeta = computed(() => laravelPageMeta(payload.value))

const columns = [
  { title: 'Name', dataIndex: 'tag_name', key: 'tag_name', ellipsis: true },
  { title: '', key: 'action', width: 100, fixed: 'right' }
]

const createOpen = ref(false)
const createLoading = ref(false)
const createForm = ref({ tag_name: '' })

const editOpen = ref(false)
const editLoading = ref(false)
const editingId = ref(null)
const editingRecord = ref(null)
const editForm = ref({ tag_name: '' })

function openCreate() {
  resetCreate()
  createOpen.value = true
}

function resetCreate() {
  createForm.value = { tag_name: '' }
}

async function submitCreate() {
  const name = String(createForm.value.tag_name || '').trim()
  if (!name) {
    return
  }
  createLoading.value = true
  try {
    await tagsAdminApi.createTag({ tag_name: name })
    notification.success({
      message: 'Success',
      description: 'Tag created successfully!'
    })
    createOpen.value = false
    await load(1)
  } catch (e) {
    showFromError(e)
  } finally {
    createLoading.value = false
  }
}

function openEdit(record) {
  editingId.value = record.id
  editingRecord.value = record
  editForm.value = { tag_name: record.tag_name || '' }
  editOpen.value = true
}

function resetEdit() {
  editingId.value = null
  editingRecord.value = null
  editForm.value = { tag_name: '' }
}

async function submitEdit() {
  const name = String(editForm.value.tag_name || '').trim()
  if (!editingId.value || !name) {
    return
  }
  const original = String(editingRecord.value?.tag_name || '').trim()
  if (name === original) {
    editOpen.value = false
    return
  }
  editLoading.value = true
  try {
    await tagsAdminApi.updateTag(editingId.value, { tag_name: name })
    notification.success({
      message: 'Success',
      description: 'Tag updated successfully!'
    })
    editOpen.value = false
    await load(lastListPage.value)
  } catch (e) {
    showFromError(e)
  } finally {
    editLoading.value = false
  }
}

async function confirmDelete(record) {
  const ok = await adminConfirm({
    title: 'Delete this tag?',
    content: 'This cannot be undone.',
    okText: 'Delete',
    cancelText: 'Cancel',
    danger: true
  })
  if (ok) {
    await doDelete(record.id)
  }
}

async function doDelete(id) {
  try {
    await tagsAdminApi.deleteTag(id)
    notification.success({
      message: 'Success',
      description: 'Tag deleted successfully!'
    })
    await load(lastListPage.value)
  } catch (e) {
    showFromError(e)
  }
}

function toTagListQuery(page = 1) {
  const query = {
    size: pageSize.value,
    page,
    tag_name: String(filters.value.tag_name || '').trim() || undefined
  }
  return Object.fromEntries(
    Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== '')
  )
}

async function load(page = 1) {
  lastListPage.value = page
  loading.value = true
  try {
    const { data } = await tagsAdminApi.tags(toTagListQuery(page))
    payload.value = tagsTablePayloadFromAdminBody(data)
    pageSize.value = payload.value.per_page ?? pageSize.value
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}

function applyFilters() {
  load(1)
}

function onPageSize(s) {
  pageSize.value = s
  load(1)
}

onMounted(() => load(1))
</script>
