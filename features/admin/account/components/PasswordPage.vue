<template>
  <a-card title="Change password" class="[&_.ant-card-head]:!min-h-[44px]">
    <div class="max-w-lg space-y-5">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-portfolio-ink" for="admin-pw-current">
          Current password
        </label>
        <a-input-password
          id="admin-pw-current"
          v-model:value="form.password_current"
          size="large"
          autocomplete="current-password"
          placeholder="Current password"
        />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-portfolio-ink" for="admin-pw-new">
          New password
        </label>
        <a-input-password
          id="admin-pw-new"
          v-model:value="form.password"
          size="large"
          autocomplete="new-password"
          placeholder="New password"
        />
      </div>
      <div>
        <label class="mb-1.5 block text-sm font-medium text-portfolio-ink" for="admin-pw-confirm">
          Confirm new password
        </label>
        <a-input-password
          id="admin-pw-confirm"
          v-model:value="form.password_confirmation"
          size="large"
          autocomplete="new-password"
          placeholder="Confirm new password"
        />
      </div>
      <div class="flex flex-wrap gap-3 border-t border-slate-100 pt-5">
        <a-button type="primary" size="large" :loading="loading" @click="onSubmit">
          Update password
        </a-button>
      </div>
    </div>
  </a-card>
</template>

<script setup>
import { ref } from 'vue'
import { notification } from 'ant-design-vue'
import { accountAdminApi } from '~/features/admin/account/services/account.api.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const { showFromError } = useApiErrorMessage()

const loading = ref(false)
const form = ref({
  password_current: '',
  password: '',
  password_confirmation: ''
})

async function onSubmit() {
  const current = String(form.value.password_current || '').trim()
  const password = String(form.value.password || '')
  const confirmation = String(form.value.password_confirmation || '')

  if (!current) {
    notification.error({
      message: 'Error',
      description: 'Please enter your current password.'
    })
    return
  }
  if (!password) {
    notification.error({
      message: 'Error',
      description: 'Please enter a new password.'
    })
    return
  }
  if (!confirmation) {
    notification.error({
      message: 'Error',
      description: 'Please confirm your new password.'
    })
    return
  }
  if (password !== confirmation) {
    notification.error({
      message: 'Error',
      description: 'New password and confirmation do not match.'
    })
    return
  }

  loading.value = true
  try {
    await accountAdminApi.changePassword({
      password_current: current,
      password,
      password_confirmation: confirmation
    })
    notification.success({
      message: 'Success',
      description: 'Password updated successfully!'
    })
    form.value = {
      password_current: '',
      password: '',
      password_confirmation: ''
    }
  } catch (e) {
    showFromError(e)
  } finally {
    loading.value = false
  }
}
</script>
