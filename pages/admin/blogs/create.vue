<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'CREATE_BLOG',
  title: 'Add blog'
})

onMounted(() => {
  navigateTo('/admin/blogs', { replace: true })
})
</script>

<template>
  <div />
</template>
