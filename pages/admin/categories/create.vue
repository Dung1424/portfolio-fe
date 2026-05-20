<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'CREATE_CATEGORY',
  title: 'Add category'
})

onMounted(() => {
  navigateTo('/admin/categories', { replace: true })
})
</script>

<template>
  <div />
</template>
