<script setup lang="ts">
import AppNavbar from './AppNavbar.vue'
</script>

<template>
  <!-- Giống chat: khóa chiều cao viewport để 2 cột dùng overflow-y-auto riêng, không cuộn cả document -->
  <div
    class="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-white font-sans text-zinc-900 antialiased"
  >
    <AppNavbar />
    <main
      class="absolute inset-x-0 bottom-0 top-[52px] flex min-h-0 flex-col overflow-hidden"
    >
      <slot />
    </main>
    <div id="scripts" />
  </div>
</template>
