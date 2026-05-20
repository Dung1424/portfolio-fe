<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'CREATE_PHOTO',
  title: 'Add photo'
})

onMounted(() => {
  navigateTo('/admin/photos', { replace: true })
})
</script>

<template>
  <div />
</template>
