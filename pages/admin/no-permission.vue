<script setup>
definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'No permission'
})

const admin = useAdminAuthStore()
</script>

<template>
  <div class="flex min-h-[60vh] items-center justify-center">
    <div class="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
      <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
        <i class="fa-solid fa-shield-halved text-xl" aria-hidden="true" />
      </div>
      <h1 class="mt-5 text-2xl font-bold text-slate-900">You do not have permission</h1>
      <p class="mt-2 text-sm text-slate-500">
        Your account cannot access this page. Contact an admin if this permission should be enabled.
      </p>
      <div class="mt-6 flex justify-center gap-3">
        <NuxtLink :to="admin.defaultPath()">
          <a-button type="primary">Go to available page</a-button>
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
