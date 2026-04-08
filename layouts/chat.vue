<script setup lang="ts">
import AppNavbar from './AppNavbar.vue'
</script>

<template>
  <!-- Navbar fixed: không để header + pt-[52px] cùng lúc (trừ chiều cao 2 lần → thừa khoảng trắng dưới) -->
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
