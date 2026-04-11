<template>
  <a-card title="New blog">
    <a-form layout="vertical" class="max-w-3xl" @finish="onSubmit">
      <a-form-item label="Title" :rules="[{ required: true }]">
        <a-input v-model:value="form.title" />
      </a-form-item>
      <a-form-item label="Content" :rules="[{ required: true }]">
        <a-textarea v-model:value="form.content" :rows="12" />
      </a-form-item>
      <a-form-item label="Cover image" :rules="[{ required: true }]">
        <input type="file" accept="image/*" @change="onCover">
      </a-form-item>
      <a-form-item label="Extra image (optional)">
        <input type="file" accept="image/*" @change="onExtra">
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
import { blogsAdminApi } from '~/features/admin/blogs/services/blogs.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const { showFromError } = useApiErrorMessage()

const loading = ref(false)
const cover = ref(null)
const extra = ref(null)
const form = ref({ title: '', content: '' })

function onCover(e) {
  cover.value = e.target?.files?.[0] || null
}
function onExtra(e) {
  extra.value = e.target?.files?.[0] || null
}

async function onSubmit() {
  if (!cover.value) {
    message.error('Cover image is required.')
    return
  }
  loading.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.value.title)
    fd.append('content', form.value.content)
    fd.append('cover_image', cover.value)
    if (extra.value) {
      fd.append('image', extra.value)
    }
    await blogsAdminApi.createBlog(fd)
    message.success('Blog created')
    await navigateTo('/admin/blogs')
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}
</script>
