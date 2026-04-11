<template>
  <a-spin :spinning="loading">
    <a-card v-if="blog" :title="blog.title ? `Edit: ${blog.title}` : 'Edit blog'">
      <a-form layout="vertical" class="max-w-3xl" @finish="onSubmit">
        <a-form-item label="Title" :rules="[{ required: true }]">
          <a-input v-model:value="form.title" />
        </a-form-item>
        <a-form-item label="Content" :rules="[{ required: true }]">
          <a-textarea v-model:value="form.content" :rows="12" />
        </a-form-item>
        <a-form-item label="Cover image (optional)">
          <input type="file" accept="image/*" @change="onCover">
        </a-form-item>
        <a-form-item label="Extra image (optional)">
          <input type="file" accept="image/*" @change="onExtra">
        </a-form-item>
        <a-form-item>
          <a-button type="primary" html-type="submit" :loading="saving">
            Save
          </a-button>
          <a-popconfirm title="Delete blog?" @confirm="remove">
            <a-button danger class="ml-2">
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
import { blogsAdminApi } from '~/features/admin/blogs/services/blogs.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const route = useRoute()
const { showFromError } = useApiErrorMessage()

const id = computed(() => route.params.id)
const loading = ref(true)
const saving = ref(false)
const blog = ref(null)
const cover = ref(null)
const extra = ref(null)
const form = ref({ title: '', content: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await blogsAdminApi.blog(id.value)
    blog.value = data.blog ?? data
    form.value = {
      title: blog.value.title ?? '',
      content: blog.value.content ?? ''
    }
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}

function onCover(e) {
  cover.value = e.target?.files?.[0] || null
}
function onExtra(e) {
  extra.value = e.target?.files?.[0] || null
}

async function onSubmit() {
  saving.value = true
  try {
    const fd = new FormData()
    fd.append('title', form.value.title)
    fd.append('content', form.value.content)
    if (cover.value) {
      fd.append('cover_image', cover.value)
    }
    if (extra.value) {
      fd.append('image', extra.value)
    }
    await blogsAdminApi.updateBlog(id.value, fd)
    message.success('Saved')
    cover.value = null
    extra.value = null
    await load()
  } catch (e) {
    showFromError(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  try {
    await blogsAdminApi.deleteBlog(id.value)
    message.success('Deleted')
    await navigateTo('/admin/blogs')
  } catch (e) {
    showFromError(e)
  }
}

watch(id, () => load(), { immediate: true })
</script>
