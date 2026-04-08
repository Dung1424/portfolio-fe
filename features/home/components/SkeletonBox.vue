<script setup lang="ts">
/**
 * Khối shimmer tùy chỉnh — dùng cho **từng vùng** (card, dòng text, avatar…), không bắt buộc full grid.
 * Class `.skeleton-shimmer` định nghĩa trong `assets/css/main.css`.
 */
withDefaults(
  defineProps<{
    /** Class Tailwind bổ sung (vd: `h-4 w-32`, `aspect-video`, `rounded-full`) */
    boxClass?: string
  }>(),
  { boxClass: '' },
)
</script>

<template>
  <div class="skeleton-shimmer" :class="boxClass" />
</template>
