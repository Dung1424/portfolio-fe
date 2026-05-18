<template>
  <div class="admin-login relative min-h-screen overflow-hidden bg-[#f4f6f8] font-sans text-portfolio-ink antialiased">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgb(24_119_242/0.12),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgb(13_30_45/0.06),transparent_45%)]" />
    <div class="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div class="mb-8 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-admin-accent font-[family-name:var(--font-portfolio-heading)]">Portfolio</p>
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-portfolio-ink sm:text-3xl font-[family-name:var(--font-portfolio-heading)]">
          Editor sign in
        </h1>
        <p class="mt-2 text-sm text-slate-500">Sign in to moderate quest submissions.</p>
      </div>

      <div class="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_4px_24px_-4px_rgb(15_23_42/0.08),0_0_0_1px_rgb(15_23_42/0.04)] sm:p-10">
        <a-form :model="formState" layout="vertical" @finish="onSubmit">
          <a-form-item label="Email" name="email" :rules="[{ required: true, message: 'Email required' }]">
            <a-input v-model:value="formState.email" type="email" size="large" autocomplete="email" placeholder="editor@example.com" />
          </a-form-item>
          <a-form-item label="Password" name="password" :rules="[{ required: true, message: 'Password required' }]">
            <a-input-password v-model:value="formState.password" size="large" autocomplete="current-password" placeholder="••••••••" />
          </a-form-item>
          <a-button type="primary" html-type="submit" size="large" block :loading="loading">
            Sign in
          </a-button>
        </a-form>
      </div>

      <p class="mt-8 text-center text-xs text-slate-400">
        <NuxtLink to="/" class="font-medium text-admin-accent transition-colors hover:text-admin-accent-hover hover:underline">
          ← Back to website
        </NuxtLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { useEditorAuthStore } from '~/stores/editorAuthStore.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

const route = useRoute()
const editor = useEditorAuthStore()
const { showFromError } = useApiErrorMessage()
const loading = ref(false)
const formState = reactive({ email: '', password: '' })

onMounted(() => {
  editor.hydrateFromStorage()
  if (editor.isLoggedIn) {
    navigateTo(editorRedirectPath(route.query.redirect))
  }
})

async function onSubmit() {
  loading.value = true
  try {
    await editor.login(formState.email, formState.password)
    message.success('Signed in')
    await navigateTo(editorRedirectPath(route.query.redirect))
  } catch (error) {
    showFromError(error, 'Login failed.')
  } finally {
    loading.value = false
  }
}

function editorRedirectPath(value) {
  if (typeof value === 'string' && value.startsWith('/editor')) {
    return value
  }
  return '/editor/submissions'
}
</script>
