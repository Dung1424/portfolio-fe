<template>
  <div class="admin-login relative min-h-screen overflow-hidden bg-[#f4f6f8] font-sans text-portfolio-ink antialiased">
    <!-- Nền: gradient + noise nhẹ giống tone site -->
    <div
      class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgb(24_119_242/0.12),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgb(13_30_45/0.06),transparent_45%)]"
      aria-hidden="true"
    />
    <div
      class="pointer-events-none absolute inset-0 opacity-[0.35] mix-blend-multiply"
      style="background-image: url('data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.06\'/%3E%3C/svg%3E')"
      aria-hidden="true"
    />

    <div class="relative mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4 py-12 sm:px-6">
      <div class="mb-8 text-center">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-admin-accent font-[family-name:var(--font-portfolio-heading)]">
          Portfolio
        </p>
        <h1 class="mt-2 text-2xl font-bold tracking-tight text-portfolio-ink sm:text-3xl font-[family-name:var(--font-portfolio-heading)]">
          Admin sign in
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          Sign in to manage photos, users, and content.
        </p>
      </div>

      <div
        class="rounded-2xl border border-slate-200/90 bg-white p-8 shadow-[0_4px_24px_-4px_rgb(15_23_42/0.08),0_0_0_1px_rgb(15_23_42/0.04)] sm:p-10"
      >
        <a-form :model="formState" layout="vertical" class="!mb-0" @finish="onSubmit">
          <a-form-item label="Email" name="email" :rules="[{ required: true, message: 'Email required' }]">
            <a-input v-model:value="formState.email" type="email" size="large" autocomplete="email" placeholder="you@example.com" />
          </a-form-item>
          <a-form-item label="Password" name="password" :rules="[{ required: true, message: 'Password required' }]">
            <a-input-password v-model:value="formState.password" size="large" autocomplete="current-password" placeholder="••••••••" />
          </a-form-item>
          <a-form-item class="!mb-0 !mt-2">
            <a-button type="primary" html-type="submit" size="large" block :loading="loading">
              Sign in
            </a-button>
          </a-form-item>
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
import { ref, reactive, onMounted } from 'vue'
import { useRoute, navigateTo } from '#app'
import { message } from 'ant-design-vue'
import { useAdminAuthStore } from '~/stores/adminAuthStore.js'
import { useApiErrorMessage } from '~/composables/useApiErrorMessage'

useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Raleway:wght@500;600;700&display=swap'
    }
  ]
})

const route = useRoute()
const admin = useAdminAuthStore()
const { showFromError } = useApiErrorMessage()

const formState = reactive({
  email: '',
  password: ''
})
const loading = ref(false)

onMounted(() => {
  admin.hydrateFromStorage()
  if (admin.isLoggedIn) {
    const r = route.query.redirect
    navigateTo(typeof r === 'string' && r.startsWith('/admin') ? r : '/admin')
  }
})

async function onSubmit() {
  loading.value = true
  try {
    await admin.login(formState.email, formState.password)
    message.success('Signed in')
    const r = route.query.redirect
    await navigateTo(typeof r === 'string' && r.startsWith('/admin') ? r : '/admin')
  } catch (err) {
    const status = err?.response?.status
    const data = err?.response?.data
    if (status === 403) {
      message.error(typeof data?.message === 'string' ? data.message : (typeof data?.error === 'string' ? data.error : 'Account locked.'))
    } else if (status === 401) {
      message.error(typeof data?.message === 'string' ? data.message : (typeof data?.error === 'string' ? data.error : 'Invalid credentials or not an admin.'))
    } else {
      showFromError(err, 'Login failed.')
    }
  } finally {
    loading.value = false
  }
}
</script>
