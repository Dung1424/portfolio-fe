<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  permission: 'UPDATE_BLOG',
  title: 'Edit blog'
})

onMounted(() => {
  navigateTo('/admin/blogs', { replace: true })
})
</script>

<template>
  <div />
</template>
