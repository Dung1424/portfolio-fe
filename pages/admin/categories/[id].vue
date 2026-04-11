<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Edit category'
})

onMounted(() => {
  navigateTo('/admin/categories', { replace: true })
})
</script>

<template>
  <div />
</template>
