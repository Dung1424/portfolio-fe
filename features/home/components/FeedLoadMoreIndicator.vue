<script setup lang="ts">
/**
 * Indicator khi **tải thêm** dữ liệu (infinite scroll / next page).
 * Khác hoàn toàn với skeleton shimmer — chỉ spinner nhỏ cuối danh sách.
 */
withDefaults(
  defineProps<{
    /** Mô tả cho screen reader */
    label?: string
  }>(),
  { label: 'Loading more' },
)
</script>

<template>
  <div
    class="flex justify-center py-5"
    role="status"
    aria-live="polite"
    aria-busy="true"
  >
    <span class="sr-only">{{ label }}</span>
    <span
      class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200/80"
      aria-hidden="true"
    >
      <i class="fa-solid fa-circle-notch animate-spin text-[18px]" />
    </span>
  </div>
</template>
