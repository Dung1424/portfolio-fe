<template>
  <a-card title="Add category">
    <a-form class="max-w-md" layout="vertical" @finish="onSubmit">
      <a-form-item label="Name" name="category_name" :rules="[{ required: true }]">
        <a-input v-model:value="form.category_name" />
      </a-form-item>
      <a-form-item label="Image (optional)">
        <input type="file" accept="image/*" @change="onFile">
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
import { ref } from 'vue'
import { navigateTo } from '#app'
import { message } from 'ant-design-vue'
import { categoriesAdminApi } from '~/features/admin/categories/services/categories.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const { showFromError } = useApiErrorMessage()

const loading = ref(false)
const file = ref(null)
const form = ref({ category_name: '' })

function onFile(e) {
  file.value = e.target?.files?.[0] || null
}

async function onSubmit() {
  loading.value = true
  try {
    const fd = new FormData()
    fd.append('category_name', form.value.category_name)
    if (file.value) {
      fd.append('image', file.value)
    }
    await categoriesAdminApi.createCategory(fd)
    message.success('Category created')
    await navigateTo('/admin/categories')
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}
</script>
