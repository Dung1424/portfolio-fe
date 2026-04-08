<script setup lang="ts">
/**
 * Placeholder kiểu 500px khi tab Following lần đầu tải (không phải infinite scroll).
 */
import SkeletonBox from './SkeletonBox.vue'
</script>

<template>
  <div
    class="w-full pb-8"
    aria-busy="true"
    aria-label="Loading following"
    role="status"
  >
    <!-- Khối “Photos of people you follow” -->
    <div class="mb-10 text-center">
      <SkeletonBox box-class="mx-auto h-7 w-72 max-w-full rounded-lg sm:h-8" />
      <SkeletonBox box-class="mx-auto mt-2 h-4 w-56 max-w-full rounded" />
    </div>
    <div class="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="n in 8"
        :key="'p-' + n"
        class="skeleton-shimmer aspect-[4/3] rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.04]"
      />
    </div>

    <!-- Khối galleries -->
    <div class="mb-8 text-center">
      <SkeletonBox box-class="mx-auto h-7 w-64 max-w-full rounded-lg" />
      <SkeletonBox box-class="mx-auto mt-2 h-4 w-48 max-w-full rounded" />
    </div>
    <div class="mb-16 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="n in 3"
        :key="'g-' + n"
        class="skeleton-shimmer h-72 rounded-2xl ring-1 ring-black/[0.04]"
      />
    </div>

    <!-- Hàng gợi ý follow (cards) -->
    <div class="text-center">
      <SkeletonBox box-class="mx-auto h-7 w-80 max-w-full rounded-lg" />
      <SkeletonBox box-class="mx-auto mt-2 h-4 w-full max-w-lg rounded" />
    </div>
    <div class="mt-10 grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
      <div
        v-for="n in 5"
        :key="'u-' + n"
        class="h-[300px] w-full max-w-[260px] skeleton-shimmer rounded-2xl ring-1 ring-black/[0.04]"
      />
    </div>
  </div>
</template>
