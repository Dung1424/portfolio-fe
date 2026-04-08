<script setup lang="ts">
import AppNavbar from './AppNavbar.vue'
import AppFooter from './AppFooter.vue'
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white font-sans text-zinc-900 antialiased">
    <AppNavbar />
    <!-- flex-1 + min-h-0: trang chat con lấy chiều cao còn lại; trang dài vẫn cuộn bình thường -->
    <main class="flex min-h-0 flex-1 flex-col pt-[52px]">
      <slot />
    </main>
    <AppFooter />
    <div id="scripts" />
  </div>
</template>
