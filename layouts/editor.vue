<template>
  <div class="admin-shell flex h-screen min-h-0 antialiased">
    <aside class="sticky top-0 flex h-screen w-[260px] shrink-0 flex-col border-r border-[#0d1e2d]/80 bg-[#0d1e2d] text-slate-100 shadow-[4px_0_24px_-4px_rgb(0_0_0/0.25)]">
      <div class="border-b border-white/10 px-4 py-5">
        <NuxtLink to="/editor/submissions" class="flex items-center gap-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-md bg-[#1877f2]/20 text-sm font-bold text-white">E</span>
          <span>
            <span class="block text-lg font-bold tracking-tight text-white font-[family-name:var(--font-portfolio-heading)]">Editor</span>
            <span class="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#1877f2]">Portfolio</span>
          </span>
        </NuxtLink>
      </div>
      <nav class="flex-1 space-y-1 px-3 py-4 text-[13px]">
        <NuxtLink
          to="/editor/submissions"
          class="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-slate-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          active-class="!bg-[#1877f2]/20 !text-white"
        >
          <span class="flex h-8 w-8 items-center justify-center rounded-md bg-white/[0.06] text-[#93c5fd]">
            <i class="fa-solid fa-list-check" aria-hidden="true" />
          </span>
          <span class="font-medium">Submissions</span>
        </NuxtLink>
      </nav>
      <div class="border-t border-white/10 px-3 py-3">
        <button type="button" class="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white" @click="logout">
          <i class="fa-solid fa-arrow-right-from-bracket text-xs" aria-hidden="true" />
          Log out
        </button>
      </div>
    </aside>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <header class="sticky top-0 z-20 flex h-[58px] shrink-0 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 shadow-[0_4px_24px_-8px_rgb(15_23_42/0.08)] backdrop-blur-md sm:px-6 lg:px-8">
        <div>
          <h1 class="text-lg font-semibold tracking-tight text-portfolio-ink sm:text-xl font-[family-name:var(--font-portfolio-heading)]">{{ title }}</h1>
          <p class="mt-0.5 hidden text-xs text-slate-500 sm:block">Editor workspace</p>
        </div>
        <div class="text-sm font-medium text-slate-700">{{ displayName }}</div>
      </header>
      <main class="admin-shell-main admin-shell-main-bg min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
        <div class="mx-auto w-full max-w-[1400px]">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useEditorAuthStore } from '~/stores/editorAuthStore.js'

const route = useRoute()
const editor = useEditorAuthStore()
const title = computed(() => typeof route.meta.title === 'string' ? route.meta.title : 'Editor')
const displayName = computed(() => editor.user?.username || editor.user?.email || 'Editor')

async function logout() {
  await editor.logout()
}
</script>
