<template>
  <Teleport to="body">
    <div
      v-if="adminConfirmState.visible"
      class="fixed inset-0 z-[2100] flex items-center justify-center p-4 sm:p-6"
      role="presentation"
    >
      <div
        class="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        aria-hidden="true"
        @click="adminConfirmCancel"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="admin-confirm-title"
        class="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_25px_50px_-12px_rgb(15_23_42/0.25)]"
        @keydown.esc.stop.prevent="adminConfirmCancel"
      >
        <div class="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-5 py-4">
          <h2 id="admin-confirm-title" class="font-[family-name:var(--font-portfolio-heading)] text-[1.0625rem] font-semibold text-portfolio-ink">
            {{ adminConfirmState.title }}
          </h2>
        </div>
        <div v-if="adminConfirmState.content" class="px-5 py-4 text-sm leading-relaxed text-slate-600">
          {{ adminConfirmState.content }}
        </div>
        <div class="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            @click="adminConfirmCancel"
          >
            {{ adminConfirmState.cancelText }}
          </button>
          <button
            type="button"
            class="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm font-medium text-white shadow-sm transition"
            :class="
              adminConfirmState.danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-admin-accent hover:bg-admin-accent-hover'
            "
            @click="adminConfirmOk"
          >
            {{ adminConfirmState.okText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { adminConfirmState, adminConfirmCancel, adminConfirmOk } from '~/composables/adminConfirm'
import { onUnmounted, watch } from 'vue'

watch(
  () => adminConfirmState.visible,
  (v) => {
    if (!import.meta.client) {
      return
    }
    document.body.style.overflow = v ? 'hidden' : ''
  }
)

onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>
