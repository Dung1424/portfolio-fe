<template>
  <a-spin :spinning="loading">
    <a-card v-if="tag" :title="tag.tag_name || 'Tag'">
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
          <a-button type="primary" html-type="submit" :loading="saving">
            Save
          </a-button>
          <a-popconfirm class="ml-2" title="Delete tag?" @confirm="remove">
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
import { notification } from 'ant-design-vue'
import { tagsAdminApi } from '~/features/admin/tags/services/tags.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const route = useRoute()
const { showFromError } = useApiErrorMessage()

const id = computed(() => route.params.id)
const loading = ref(true)
const saving = ref(false)
const tag = ref(null)
const form = ref({ tag_name: '' })

async function load() {
  loading.value = true
  try {
    const { data } = await tagsAdminApi.tag(id.value)
    tag.value = data.tag ?? data
    form.value.tag_name = tag.value.tag_name || ''
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}

async function onSubmit() {
  const name = String(form.value.tag_name || '').trim()
  if (!name) {
    return
  }
  const original = String(tag.value?.tag_name || '').trim()
  if (name === original) {
    return
  }
  saving.value = true
  try {
    await tagsAdminApi.updateTag(id.value, { tag_name: name })
    notification.success({
      message: 'Success',
      description: 'Tag updated successfully!'
    })
    await load()
  } catch (e) {
    showFromError(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  try {
    await tagsAdminApi.deleteTag(id.value)
    notification.success({
      message: 'Success',
      description: 'Tag deleted successfully!'
    })
    await navigateTo('/admin/tags')
  } catch (e) {
    showFromError(e)
  }
}

watch(id, () => load(), { immediate: true })
</script>
