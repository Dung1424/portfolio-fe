<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Add photo'
})

onMounted(() => {
  navigateTo('/admin/photos', { replace: true })
})
</script>

<template>
  <div />
</template>
