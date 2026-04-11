<template>
  <a-card title="Add tag">
    <a-form class="max-w-md" layout="vertical" :model="form" @finish="onSubmit">
      <a-form-item
        label="Name"
        name="tag_name"
        :rules="[
          { required: true, message: 'Please enter a tag name' },
          { max: 50, message: 'Max 50 characters' }
        ]"
      >
        <a-input v-model:value="form.tag_name" :maxlength="50" show-count />
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
import { notification } from 'ant-design-vue'
import { tagsAdminApi } from '~/features/admin/tags/services/tags.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const { showFromError } = useApiErrorMessage()

const loading = ref(false)
const form = ref({ tag_name: '' })

async function onSubmit() {
  const name = String(form.value.tag_name || '').trim()
  if (!name) {
    return
  }
  loading.value = true
  try {
    await tagsAdminApi.createTag({ tag_name: name })
    notification.success({
      message: 'Success',
      description: 'Tag created successfully!'
    })
    await navigateTo('/admin/tags')
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}
</script>
