<script setup>
import { onMounted } from 'vue'
import { navigateTo } from '#app'

definePageMeta({
  layout: 'admin',
  middleware: ['admin-auth'],
  title: 'Edit blog'
})

onMounted(() => {
  navigateTo('/admin/blogs', { replace: true })
})
</script>

<template>
  <div />
</template>
