<script setup lang="ts">
/** Opt-in: mount chỉ trong layout/page cần overlay; điều khiển bằng `useAppPageSkeleton()`. */
const visible = useAppPageSkeleton()

watch(
  visible,
  (v) => {
    if (import.meta.client) {
      document.body.style.overflow = v ? 'hidden' : ''
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (import.meta.client) {
    document.body.style.overflow = ''
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      leave-active-class="transition-opacity duration-300 ease-in"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="visible"
        class="fixed inset-0 z-[9998] flex flex-col bg-white"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading"
      >
        <!-- Thanh nav giả (khớp navbar ~52px) -->
        <header class="flex h-[52px] shrink-0 items-center gap-6 border-b border-zinc-100 px-4 sm:px-6 lg:px-8">
          <div class="skeleton-shimmer h-5 w-28 rounded-md" />
          <div class="hidden flex-1 items-center justify-center gap-4 lg:flex">
            <div class="skeleton-shimmer h-4 w-16 rounded" />
            <div class="skeleton-shimmer h-4 w-16 rounded" />
            <div class="skeleton-shimmer h-4 w-12 rounded" />
            <div class="skeleton-shimmer h-4 w-20 rounded" />
          </div>
          <div class="ml-auto flex items-center gap-2">
            <div class="skeleton-shimmer h-9 w-9 shrink-0 rounded-full" />
            <div class="skeleton-shimmer h-9 w-9 shrink-0 rounded-full" />
            <div class="skeleton-shimmer hidden h-9 w-24 rounded-full sm:block" />
          </div>
        </header>

        <!-- Nội dung: tab + grid ảnh (khung + shimmer) -->
        <div class="mx-auto w-full max-w-[1600px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div class="mb-8 flex justify-center gap-2">
            <div class="skeleton-shimmer h-10 w-24 rounded-full" />
            <div class="skeleton-shimmer h-10 w-24 rounded-full" />
            <div class="skeleton-shimmer h-10 w-24 rounded-full" />
          </div>
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5">
            <div
              v-for="n in 10"
              :key="n"
              class="skeleton-shimmer aspect-[4/5] rounded-xl sm:aspect-[3/4]"
            />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
