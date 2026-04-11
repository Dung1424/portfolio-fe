<template>
  <a-card title="Add photo">
    <a-form :label-col="{ span: 24 }" :wrapper-col="{ span: 24 }" class="max-w-xl" @finish="onSubmit">
      <a-form-item label="Title" name="title" :rules="[{ required: true }]">
        <a-input v-model:value="form.title" />
      </a-form-item>
      <a-form-item label="Description">
        <a-textarea v-model:value="form.description" :rows="3" />
      </a-form-item>
      <a-form-item label="Location">
        <a-input v-model:value="form.location" />
      </a-form-item>
      <a-form-item label="Image" :rules="[{ required: true, message: 'Image required' }]">
        <input type="file" accept="image/*" @change="onFile">
      </a-form-item>
      <a-form-item label="Category" :rules="[{ required: true }]">
        <a-select
          v-model:value="form.category_id"
          :options="categoryOptions"
          placeholder="Select category"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="Privacy" :rules="[{ required: true }]">
        <a-select
          v-model:value="form.privacy_status"
          :options="[
            { value: '0', label: 'Public' },
            { value: '1', label: 'Private' }
          ]"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item label="Tags">
        <a-select
          v-model:value="form.tag_ids"
          mode="multiple"
          :options="tagOptions"
          placeholder="Select tags"
          allow-clear
          show-search
          option-filter-prop="label"
          style="width: 100%"
        />
      </a-form-item>
      <a-form-item>
        <a-button type="primary" html-type="submit" :loading="loading">
          Create
        </a-button>
      </a-form-item>
    </a-form>
  </a-card>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { navigateTo } from '#app'
import { message } from 'ant-design-vue'
import { photosAdminApi } from '~/features/admin/photos/services/photos.api.js'
import { categoriesAdminApi, categoriesListFromAdminBody } from '~/features/admin/categories/services/categories.api.js'
import { tagsAdminApi, tagsListFromAdminBody } from '~/features/admin/tags/services/tags.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const { showFromError } = useApiErrorMessage()

const loading = ref(false)
const categories = ref([])
const tagList = ref([])
const file = ref(null)

const form = ref({
  title: '',
  description: '',
  location: '',
  category_id: undefined,
  privacy_status: '0',
  tag_ids: []
})

const categoryOptions = computed(() =>
  categories.value.map((c) => ({
    value: String(c.id),
    label: c.category_name || c.name || 'Untitled category'
  }))
)

const tagOptions = computed(() =>
  tagList.value.map((t) => ({
    value: String(t.id),
    label: t.tag_name || 'Untitled tag'
  }))
)

function tagsPayloadFromIds(ids) {
  const names = (ids || [])
    .map((id) => tagList.value.find((t) => String(t.id) === String(id))?.tag_name)
    .filter(Boolean)
  return names.join(',')
}

onMounted(async () => {
  try {
    const [{ data: d1 }, { data: d2 }] = await Promise.all([
      categoriesAdminApi.categories({ chunkSize: 100 }),
      tagsAdminApi.tags({ size: 500, page: 1 })
    ])
    categories.value = categoriesListFromAdminBody(d1)
    tagList.value = tagsListFromAdminBody(d2)
  } catch (e) {
    showFromError(e)
  }
})

function onFile(e) {
  const f = e.target?.files?.[0]
  file.value = f || null
}

async function onSubmit() {
  if (!file.value) {
    message.error('Please choose an image.')
    return
  }
  loading.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.value.title)
    fd.append('description', form.value.description || '')
    fd.append('location', form.value.location || '')
    fd.append('image', file.value)
    fd.append('category_id', String(form.value.category_id))
    fd.append('privacy_status', String(form.value.privacy_status))
    fd.append('tags', tagsPayloadFromIds(form.value.tag_ids))
    await photosAdminApi.createPhoto(fd)
    message.success('Photo created')
    await navigateTo('/admin/photos')
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}
</script>
