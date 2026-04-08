<script setup lang="ts">
/**
 * Placeholder kiểu 500px khi tab Explore lần đầu tải (nhiều section — Favorite photos, photographers, categories, galleries).
 */
import SkeletonBox from './SkeletonBox.vue'
</script>

<template>
  <div
    id="explore-feed-skeleton"
    class="flex flex-col gap-16 pb-8"
    aria-busy="true"
    aria-label="Loading explore"
    role="status"
  >
    <!-- Favorite Photos -->
    <section>
      <div class="mb-8 text-center">
        <SkeletonBox box-class="mx-auto h-8 w-64 max-w-full rounded-lg sm:w-72" />
        <SkeletonBox box-class="mx-auto mt-2 h-4 w-56 max-w-full rounded" />
      </div>
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <div
          v-for="n in 8"
          :key="'fp-' + n"
          class="skeleton-shimmer aspect-[4/3] rounded-2xl ring-1 ring-black/[0.04]"
        />
      </div>
    </section>

    <!-- Featured Photographers -->
    <section>
      <div class="mb-8 sm:text-left">
        <SkeletonBox box-class="h-8 w-64 max-w-full rounded-lg" />
        <SkeletonBox box-class="mt-2 h-4 w-80 max-w-full rounded" />
      </div>
      <div class="grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <div
          v-for="n in 5"
          :key="'u-' + n"
          class="h-[300px] w-full max-w-[260px] skeleton-shimmer rounded-2xl ring-1 ring-black/[0.04]"
        />
      </div>
    </section>

    <!-- Top Categories -->
    <section>
      <div class="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <SkeletonBox box-class="h-8 w-48 rounded-lg" />
          <SkeletonBox box-class="mt-2 h-4 w-72 max-w-full rounded" />
        </div>
        <SkeletonBox box-class="h-5 w-24 rounded" />
      </div>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div
          v-for="n in 4"
          :key="'c-' + n"
          class="skeleton-shimmer aspect-[4/3] rounded-xl ring-1 ring-black/[0.04]"
        />
      </div>
    </section>

    <!-- Favorite Gallery -->
    <section>
      <div class="mb-6">
        <SkeletonBox box-class="h-8 w-56 rounded-lg" />
        <SkeletonBox box-class="mt-2 h-4 w-80 max-w-full rounded" />
      </div>
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="n in 3"
          :key="'gl-' + n"
          class="skeleton-shimmer h-72 rounded-2xl ring-1 ring-black/[0.04]"
        />
      </div>
    </section>
  </div>
</template>
