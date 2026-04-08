<script setup lang="ts">
/**
 * Placeholder lưới / masonry kiểu 500px — **chỉ khi lần đầu chưa có ảnh** (initial load).
 * Tải thêm trang: dùng `FeedLoadMoreIndicator` (spinner), không dùng component này.
 * @see composables/useSkeletonPlaceholder.ts
 */
withDefaults(
  defineProps<{
    layout: 'grid' | 'masonry'
    /** Số ô skeleton (grid); masonry cố định theo danh sách chiều cao bên dưới */
    count?: number
  }>(),
  { count: 12 },
)

const masonryHeights = [
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-square',
  'aspect-[5/6]',
  'aspect-[4/5]',
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-square',
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-[5/6]',
  'aspect-[3/4]',
  'aspect-[4/5]',
  'aspect-[3/4]',
] as const
</script>

<template>
  <div
    aria-busy="true"
    aria-label="Loading feed"
    class="w-full"
  >
    <!-- Grid: cùng rhythm với ForYou grid -->
    <div
      v-if="layout === 'grid'"
      class="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 xl:grid-cols-5"
    >
      <div
        v-for="n in count"
        :key="n"
        class="skeleton-shimmer aspect-[4/5] rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04] sm:aspect-[3/4]"
      />
    </div>

    <!-- Masonry: chiều cao đổi nhẹ như discovery -->
    <div
      v-else
      class="columns-2 gap-4 sm:columns-3 sm:gap-5 lg:columns-4 xl:columns-5 [column-fill:_balance]"
    >
      <div
        v-for="(cls, i) in masonryHeights"
        :key="i"
        class="mb-4 break-inside-avoid"
      >
        <div
          class="skeleton-shimmer w-full overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
          :class="cls"
        />
      </div>
    </div>
  </div>
</template>
