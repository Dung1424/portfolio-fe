<template>
  <div class="admin-shell flex h-screen min-h-0 antialiased">
    <AdminSidebar />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <AdminHeader :title="headerTitle" />
      <ClientOnly>
        <AdminRecentTabsBar />
      </ClientOnly>
      <main class="admin-shell-main admin-shell-main-bg min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-[1400px]">
          <slot />
        </div>
      </main>
    </div>
    <AdminConfirmModal />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AdminHeader from './AdminHeader.vue'
import AdminSidebar from './AdminSidebar.vue'

useHead({
  link: [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Raleway:wght@500;600;700&display=swap'
    }
  ]
})

const route = useRoute()
const headerTitle = computed(() => {
  const m = route.meta.title
  return typeof m === 'string' ? m : 'Admin'
})
</script>
