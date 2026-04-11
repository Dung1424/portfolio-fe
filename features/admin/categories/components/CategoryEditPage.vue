<template>
  <a-spin :spinning="loading">
    <a-card v-if="category" :title="category.category_name || category.name || 'Category'">
      <a-form class="max-w-md" layout="vertical" @finish="onSubmit">
        <a-form-item label="Name" :rules="[{ required: true }]">
          <a-input v-model:value="form.category_name" />
        </a-form-item>
        <a-form-item label="Image (optional)">
          <input type="file" accept="image/*" @change="onFile">
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="saving">
            Save
          </a-button>
          <a-popconfirm class="ml-2" title="Delete category?" @confirm="remove">
            <a-button danger>
              Delete
            </a-button>
          </a-popconfirm>
        </a-form-item>
      </a-form>
    </a-card>
  </a-spin>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { useRoute, navigateTo } from '#app'
import { message } from 'ant-design-vue'
import { categoriesAdminApi } from '~/features/admin/categories/services/categories.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const route = useRoute()
const { showFromError } = useApiErrorMessage()

const id = computed(() => route.params.id)
const loading = ref(true)
const saving = ref(false)
const category = ref(null)
const file = ref(null)
const form = ref({ category_name: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await categoriesAdminApi.category(id.value)
    category.value = data.category ?? data
    form.value.category_name = category.value.category_name || category.value.name || ''
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}

function onFile(e) {
  file.value = e.target?.files?.[0] || null
}

async function onSubmit() {
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('category_name', form.value.category_name)
    if (file.value) {
      fd.append('image', file.value)
    }
    await categoriesAdminApi.updateCategory(id.value, fd)
    message.success('Saved')
    file.value = null
    await load()
  } catch (e) {
    showFromError(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  try {
    await categoriesAdminApi.deleteCategory(id.value)
    message.success('Deleted')
    await navigateTo('/admin/categories')
  } catch (e) {
    showFromError(e)
  }
}

watch(id, () => load(), { immediate: true })
</script>
