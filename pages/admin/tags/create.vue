<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Add tag'
})

onMounted(() => {
  navigateTo('/admin/tags', { replace: true })
})
</script>

<template>
  <div />
</template>
