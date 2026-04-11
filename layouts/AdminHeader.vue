<template>
  <header
    class="sticky top-0 z-20 flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-[0_4px_24px_-8px_rgb(15_23_42/0.08)] backdrop-blur-md sm:px-6 lg:px-8"
  >
    <div class="min-w-0 flex-1 pr-4">
      <h1 class="truncate text-lg font-semibold tracking-tight text-portfolio-ink sm:text-xl font-[family-name:var(--font-portfolio-heading)]">
        {{ title }}
      </h1>
      <p class="mt-0.5 hidden text-xs text-slate-500 sm:block">
        Portfolio administration
      </p>
    </div>
    <a-dropdown placement="bottomRight" :trigger="['click']">
      <button
        type="button"
        class="inline-flex max-w-[220px] shrink-0 items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-2 pr-3 text-sm text-[#0d1e2d] shadow-sm transition hover:border-[#1877f2]/40 hover:bg-slate-50"
      >
        <span
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1877f2]/10 text-xs font-semibold text-[#1877f2]"
          aria-hidden="true"
        >
          {{ initials }}
        </span>
        <span class="truncate text-left font-medium">{{ displayName }}</span>
        <i class="fa-solid fa-chevron-down text-[10px] text-slate-400" aria-hidden="true" />
      </button>
      <template #overlay>
        <a-menu class="min-w-[160px] rounded-lg shadow-lg">
          <a-menu-item key="logout" class="!rounded-md" @click="onLogout">
            <span class="inline-flex items-center gap-2">
              <i class="fa-solid fa-arrow-right-from-bracket w-4 text-slate-500" aria-hidden="true" />
              Log out
            </span>
          </a-menu-item>
        </a-menu>
      </template>
    </a-dropdown>
  </header>
</template>

<script setup>
import { computed } from 'vue'
import { useAdminAuthStore } from '~/stores/adminAuthStore.js'

defineProps({
  title: { type: String, default: '' }
})

const admin = useAdminAuthStore()

const displayName = computed(() => {
  const u = admin.user
  if (!u) {
    return 'Admin'
  }
  return u.username || u.email || 'Admin'
})

const initials = computed(() => {
  const n = displayName.value
  if (!n || n === 'Admin') {
    return 'A'
  }
  const parts = n.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2)
  }
  return n.slice(0, 2).toUpperCase()
})

async function onLogout() {
  await admin.logout()
}
</script>
