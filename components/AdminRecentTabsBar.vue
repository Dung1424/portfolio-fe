<template>
  <div
    v-if="tabs.length > 0"
    class="flex min-h-[42px] flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200/70 bg-slate-50/80 px-4 py-2 sm:px-6 lg:px-8"
  >
    <span class="shrink-0 text-[11px] font-medium uppercase tracking-wide text-slate-500">
      Trang gần đây
    </span>
    <div class="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div
        v-for="tab in tabs"
        :key="tab.fullPath"
        class="inline-flex max-w-[220px] shrink-0 items-stretch rounded-lg border text-xs font-medium shadow-sm transition"
        :class="
          isActive(tab.fullPath)
            ? 'border-[#1877f2]/50 bg-[#1877f2]/10 text-[#0d1e2d]'
            : 'border-slate-200/90 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
        "
      >
        <NuxtLink
          :to="tab.fullPath"
          class="flex min-w-0 flex-1 items-center px-2 py-1 font-medium"
          :title="tab.title"
        >
          <span class="truncate">{{ tab.title }}</span>
        </NuxtLink>
        <button
          type="button"
          class="flex w-7 shrink-0 items-center justify-center border-l border-slate-200/80 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-700"
          :class="isActive(tab.fullPath) ? 'border-[#1877f2]/25' : ''"
          :aria-label="`Đóng tab ${tab.title}`"
          @click="onClose(tab.fullPath)"
        >
          <i class="fa-solid fa-xmark text-[10px]" aria-hidden="true" />
        </button>
      </div>
    </div>
    <button
      type="button"
      class="shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
      @click="onClearAll"
    >
      Xóa tất cả
    </button>
  </div>
</template>

<script setup lang="ts">
const { tabs, removeTab, clearAll, isActive } = useAdminRecentTabs()

function onClose(fullPath: string) {
  removeTab(fullPath)
}

function onClearAll() {
  clearAll()
}
</script>
