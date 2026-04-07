<script setup lang="ts">
import AppNavbar from './AppNavbar.vue'
import AppFooter from './AppFooter.vue'
</script>

<template>
  <div class="app-shell">
    <AppNavbar />
    <main class="app-main">
      <slot />
    </main>
    <AppFooter />
    <div id="scripts" />
  </div>
</template>

<style scoped>
.app-main {
  margin-top: 60px;
}
</style>
